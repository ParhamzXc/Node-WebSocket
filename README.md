<div align="center">

# Node-WebSocket
Dual-Protocol Proxy implemented based on serverless, no kernel & lightweight.

1. Fork this repository
2. Allow GitHub Actions `I understand my workflows, go ahead and enable them` button
## 3. Refer to the example.js clear text code and fill in the required variables, then obfuscate, save and replace it in the index.js file. The js obfuscation address: https://obfuscator.io
## 4. Modify the image name in .github/workflows/build-image.yml - line 44

---

Telegram：http://notparham.t.me

</div>

## [Web-Hosting Deployment Guide](https://github.com/ParhamzXc/Node-WebSocket/blob/main/web-hosting.md) (Applicable to all DirectAdmin panels with nodejs App function)

* Tools for node environment, based on node three-party ws library, Vless+Trojan dual protocol, integrated Nezha probe service (v0 or v1), you can add environment variables by YOURSELF.

* Environment variables set by the PaaS platform
  | Variable name        | Required | Default | Remarks |
  | ------------ | ------ | ------ | ------ |
  | UUID         | No |########-####-####-####-############| If Nezha v1 is On, modify the UUID|
  | PORT         | No |  3000  |  Listenport                    |
  | NEZHA_SERVER | No |        |Nezha v1 fill-in form: nz.abc.com:8008 Nezha v0 fill-in form: nz.abc.com|
  | NEZHA_PORT   | No |        | Nezha v1 does not have this variable, the agent port of v0| 
  | NEZHA_KEY    | No |        | NZ_CLIENT_SECRET of Nezha v1 or agent port of v0 |
  | NAME         | No |        | Node name prefix, for example: Glitch |
  | DOMAIN       | Yes |        | The domain name assigned to the project or the domain name that has been reversed, excluding the https:// prefix  |
  | SUB_PATH     | No |  sub   | Subscription path   |
  | AUTO_ACCESS  | No |  false | Whether to enable automatic access keep-alive, false means off, true means on, the DOMAIN variable needs to be filled in at the same time |
  

* Domain name/${SUB_APTH} View node information, non-standard port, domain name: port/${SUB_APTH} SUB_APTH is the subscription token set by yourself, if not set, the default is sub
    
* Warm reminder: READAME.md is a description file, please do not upload it.
* Encrypt JavaScript：https://obfuscator.io

### Use Cloudflare-Workers or snippets to reverse the domain name to accelerate the CDN on the node
```
export default {
    async fetch(request, env) {
        let url = new URL(request.url);
        if (url.pathname.startsWith('/')) {
            var arrStr = [
                'change.your.domain', // Fill in your node camouflage domain name in single quotes here
            ];
            url.protocol = 'https:'
            url.hostname = getRandomArray(arrStr)
            let new_request = new Request(url, request);
            return fetch(new_request);
        }
        return env.ASSETS.fetch(request);
    },
};
function getRandomArray(array) {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}
```


## Open source agreement description (based on GPL)

This project is released under the GNU General Public License (GPL), with the following instructions:

You may freely use, copy, modify and distribute the source code of this project, provided that you retain the original author's information and the contents of this agreement;
Modified versions must also be open sourced under the same license;
This project or any part of it may not be used for commercial purposes without express authorization from the original author.

Commercial uses include but are not limited to:

Embed this item into software, systems or services sold;
Profit directly or indirectly from this project (such as through advertising, SaaS services, etc.);
Used as a business tool within a company or organization.

For commercial authorization, please contact the original author: [the_parham@yahoo.com]

Copyright ©2026 ParhamX
