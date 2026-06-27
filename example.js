const os = require('os');
const http = require('http');
const fs = require('fs');
const axios = require('axios');
const net = require('net');
const path = require('path');
const { Buffer } = require('buffer');
const { exec, execSync } = require('child_process');
const { WebSocket, createWebSocketStream } = require('ws');

// Fill in parameters
const UUID = process.env.UUID || 'define-your-uuid-here';             // When running Nezha v1, UUID must be changed on different platforms, otherwise it will be overwritten
const DOMAIN = process.env.DOMAIN || 'your-project-domain.com';       // Enter the project domain, without the "https://" prefix
const AUTO_ACCESS = process.env.AUTO_ACCESS || false;                 // Whether to enable auto-access keep-alive; false = disabled, true = enabled; DOMAIN variable must also be set
const WSPATH = process.env.WSPATH || UUID.slice(0, 8);                // Node path, defaults to the first 8 characters of the UUID
const SUB_PATH = process.env.SUB_PATH || 'sub';                       // Subscription path for retrieving nodes
const NAME = process.env.NAME || '';                                  // Node name
const PORT = process.env.PORT || 3000;                                // HTTP and WebSocket server port

// Nezha fields can be left empty
const NEZHA_SERVER = process.env.NEZHA_SERVER || '';       // Nezha v1 format: nz.abc.com:8008   Nezha v0 format: nz.abc.com
const NEZHA_PORT = process.env.NEZHA_PORT || '';           // Nezha v1 does not use this variable; TLS is enabled when v0 agent port is one of {443,8443,2096,2087,2083,2053}
const NEZHA_KEY = process.env.NEZHA_KEY || '';             // NZ_CLIENT_SECRET for v1, or the agent key for v0

let ISP = '';
const GetISP = async () => {
  try {
    const res = await axios.get('https://speed.cloudflare.com/meta');
    const data = res.data;
    ISP = `${data.country}-${data.asOrganization}`.replace(/ /g, '_');
  } catch (e) {
    ISP = 'Unknown';
  }
}
GetISP();

const httpServer = http.createServer((req, res) => {
  if (req.url === '/') {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('Hello world!');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    });
    return;
  } else if (req.url === `/${SUB_PATH}`) {
    const namePart = NAME ? `${NAME}-${ISP}` : ISP;
    
    // **Modify VLESS subscription link to meet requirements**
    // Using preferred CDN domain (cdns.doon.eu.org), fingerprint (fp)=chrome, ALPN=http/1.1
    const vlessURL = `vless://${UUID}@cdns.doon.eu.org:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&alpn=http%2F1.1&type=ws&host=${DOMAIN}&path=%2F${WSPATH}#${namePart}`;
    
    const subscription = vlessURL; // Keep only VLESS
    const base64Content = Buffer.from(subscription).toString('base64');
    
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(base64Content + '\n');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found\n');
  }
});

const wss = new WebSocket.Server({ server: httpServer });
const uuid = UUID.replace(/-/g, "");
const DNS_SERVERS = ['8.8.4.4', '1.1.1.1'];

// Custom DNS
function resolveHost(host) {
  return new Promise((resolve, reject) => {
    if (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(host)) {
      resolve(host);
      return;
    }
    let attempts = 0;
    function tryNextDNS() {
      if (attempts >= DNS_SERVERS.length) {
        reject(new Error(`Failed to resolve ${host} with all DNS servers`));
        return;
      }
      const dnsServer = DNS_SERVERS[attempts];
      attempts++;
      const dnsQuery = `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`;
      axios.get(dnsQuery, {
        timeout: 5000,
        headers: {
          'Accept': 'application/dns-json'
        }
      })
      .then(response => {
        const data = response.data;
        if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
          const ip = data.Answer.find(record => record.type === 1);
          if (ip) {
            resolve(ip.data);
            return;
          }
        }
        tryNextDNS();
      })
      .catch(error => {
        tryNextDNS();
      });
    }
    
    tryNextDNS();
  });
}

// VLESS handling
function handleVlessConnection(ws, msg) {
  const [VERSION] = msg;
  const id = msg.slice(1, 17);
  if (!id.every((v, i) => v == parseInt(uuid.substr(i * 2, 2), 16))) return false;
  
  let i = msg.slice(17, 18).readUInt8() + 19;
  const port = msg.slice(i, i += 2).readUInt16BE(0);
  const ATYP = msg.slice(i, i += 1).readUInt8();
  const host = ATYP == 1 ? msg.slice(i, i += 4).join('.') :
    (ATYP == 2 ? new TextDecoder().decode(msg.slice(i + 1, i += 1 + msg.slice(i, i + 1).readUInt8())) :
    (ATYP == 3 ? msg.slice(i, i += 16).reduce((s, b, i, a) => (i % 2 ? s.concat(a.slice(i - 1, i + 1)) : s), []).map(b => b.readUInt16BE(0).toString(16)).join(':') : ''));
  ws.send(new Uint8Array([VERSION, 0]));
  const duplex = createWebSocketStream(ws);
  resolveHost(host)
    .then(resolvedIP => {
      net.connect({ host: resolvedIP, port }, function() {
        this.write(msg.slice(i));
        duplex.on('error', () => {}).pipe(this).on('error', () => {}).pipe(duplex);
      }).on('error', () => {});
    })
    .catch(error => {
      net.connect({ host, port }, function() {
        this.write(msg.slice(i));
        duplex.on('error', () => {}).pipe(this).on('error', () => {}).pipe(duplex);
      }).on('error', () => {});
    });
  
  return true;
}

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const url = req.url || '';
  // Check if the path matches WSPATH
  if (url !== `/${WSPATH}`) {
    ws.close();
    return;
  }
  
  ws.once('message', msg => {
    // VLESS protocol check
    if (msg.length > 17 && msg[0] === 0) {
      const id = msg.slice(1, 17);
      const isVless = id.every((v, i) => v == parseInt(uuid.substr(i * 2, 2), 16));
      if (isVless) {
        if (!handleVlessConnection(ws, msg)) {
          ws.close();
        }
        return;
      }
    }
    
    // If not VLESS, close the connection (Trojan handling from the original code has been removed)
    ws.close();

  }).on('error', () => {});
});

const getDownloadUrl = () => {
  const arch = os.arch(); 
  if (arch === 'arm' || arch === 'arm64' || arch === 'aarch64') {
    if (!NEZHA_PORT) {
      return 'https://arm64.ssss.nyc.mn/v1';
    } else {
      return 'https://arm64.ssss.nyc.mn/agent';
    }
  } else {
    if (!NEZHA_PORT) {
      return 'https://amd64.ssss.nyc.mn/v1';
    } else {
      return 'https://amd64.ssss.nyc.mn/agent';
    }
  }
};

const downloadFile = async () => {
  if (!NEZHA_SERVER && !NEZHA_KEY) return;
  
  try {
    const url = getDownloadUrl();
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream('npm');
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log('npm download successfully');
        exec('chmod +x npm', (err) => {
          if (err) reject(err);
          resolve();
        });
      });
      writer.on('error', reject);
    });
  } catch (err) {
    throw err;
  }
};

const runnz = async () => {
  try {
    const status = execSync('ps aux | grep -v "grep" | grep "./[n]pm"', { encoding: 'utf-8' });
    if (status.trim() !== '') {
      console.log('npm is already running, skip running...');
      return;
    }
  } catch (e) {
    // Continue running Nezha if process does not exist
  }

  await downloadFile();
  let command = '';
  let tlsPorts = ['443', '8443', '2096', '2087', '2083', '2053'];
  
  if (NEZHA_SERVER && NEZHA_PORT && NEZHA_KEY) {
    const NEZHA_TLS = tlsPorts.includes(NEZHA_PORT) ? '--tls' : '';
    command = `setsid nohup ./npm -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${NEZHA_TLS} --disable-auto-update --report-delay 4 --skip-conn --skip-procs >/dev/null 2>&1 &`;
  } else if (NEZHA_SERVER && NEZHA_KEY) {
    if (!NEZHA_PORT) {
      const port = NEZHA_SERVER.includes(':') ? NEZHA_SERVER.split(':').pop() : '';
      const NZ_TLS = tlsPorts.includes(port) ? 'true' : 'false';
      const configYaml = `client_secret: ${NEZHA_KEY}
debug: false
disable_auto_update: true
disable_command_execute: false
disable_force_update: true
disable_nat: false
disable_send_query: false
gpu: false
insecure_tls: true
ip_report_period: 1800
report_delay: 4
server: ${NEZHA_SERVER}
skip_connection_count: true
skip_procs_count: true
temperature: false
tls: ${NZ_TLS}
use_gitee_to_upgrade: false
use_ipv6_country_code: false
uuid: ${UUID}`;
      
      fs.writeFileSync('config.yaml', configYaml);
    }
    command = `setsid nohup ./npm -c config.yaml >/dev/null 2>&1 &`;
  } else {
    console.log('NEZHA variable is empty, skip running');
    return;
  }

  try {
    exec(command, { shell: '/bin/bash' }, (err) => {
      if (err) console.error('npm running error:', err);
      else console.log('npm is running');
    });
  } catch (error) {
    console.error(`error: ${error}`);
  }   
}; 

async function addAccessTask() {
  if (!AUTO_ACCESS) return;

  if (!DOMAIN) {
    return;
  }
  const fullURL = `https://${DOMAIN}/${SUB_PATH}`;
  try {
    const res = await axios.post("https://oooo.serv00.net/add-url", {
      url: fullURL
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Automatic Access Task added successfully');
  } catch (error) {
    // console.error('Error adding Task:', error.message);
  }
}

const delFiles = () => {
  fs.unlink('npm', () => {});
  fs.unlink('config.yaml', () => {}); 
};

httpServer.listen(PORT, () => {
  runnz();
  setTimeout(() => {
    delFiles();
  }, 180000);
  addAccessTask();
  console.log(`Server is running on port ${PORT}`);
});
