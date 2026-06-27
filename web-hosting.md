## Web Hosting Deployment Guide (For all DirectAdmin panels with Node.js app functionality)

## Deployment Process

1: Log in to the DirectAdmin control panel and configure the domain. (You can skip this step if you have already set up your own subdomain.) Go to `Account Manager` > `Domain Setup` > `RENAME DOMAIN`, select the old domain, enter the new subdomain, and click **SAVE**. Refer to the image below:
![image](https://github.com/user-attachments/assets/823bbe4a-5343-4322-9c1b-a1f80c97f9ed)

![image](https://github.com/user-attachments/assets/e400548f-225f-4716-8973-35ee8aa68986)


2: After configuring the domain, check the IP address to which the domain needs to resolve (click "DNS Management" to view it). Open Cloudflare, locate the root domain associated with the subdomain added in the previous step, add an A record, and enable the "orange cloud" (proxy status).
![image](https://github.com/user-attachments/assets/be3a1c29-50b2-41f7-af76-07c170cafc7d)

![image](https://github.com/user-attachments/assets/4862226b-a053-458c-a842-7da80da14a66)


**3: After the DNS resolution is complete, return to the dashboard, locate and enter the File Manager, and navigate to the `domains/your-domain/public_html` directory. Right-click and select "Upload Files" to upload the `index.js` and `package.json` files from this project.**
![image](https://github.com/user-attachments/assets/fdeaa875-739d-42e9-b6fc-e50005446a1f)


**4: Set the permissions for `index.js` to 777 and modify the necessary environment variables within the file. `DOMAIN` is mandatory; set `AUTO_ACCESS` to `true` to enable automatic keep-alive; other parameters (such as those for Nezha) are optional.**
![image](https://github.com/user-attachments/assets/5b2cd552-9dc4-4537-a899-967472d83ef2)

![image](https://github.com/user-attachments/assets/4096918b-46e2-4745-b525-55e5c12d6773)


**5: Copy the path from the address bar (excluding the leading slash)—format: `domains/your-domain/public_html`—then click the icon in the top-left corner to return to the main dashboard.**

**6: Locate and enter "Setup Node.js App," then click "CREATE APPLICATION." Select the recommended Node.js version and set the mode to "Production." Set the "Application root" to the path copied in the previous step, leave "Application URL" blank, set the "Application startup file" to `index.js`, and click "CREATE" in the top-right corner.**
![image](https://github.com/user-attachments/assets/6df13972-a213-4bd5-a055-821fcd34e340)


**7: Once creation is successful (as shown in the image below), click the "RUN NPM install" button and wait 30 seconds.**
![image](https://github.com/user-attachments/assets/c094064e-6433-49a8-bd15-43c060d6752e)

![image](https://github.com/user-attachments/assets/623d3888-e96c-498d-ac9a-84cacca4fea0)


**8: Return to the main Node.js App page and click "Restart." You can then access `domain/${SUB_PATH}` to retrieve the node. If the `${SUB_PATH}` variable was not modified, the default subscription link is `https://domain/sub`.**
![image](https://github.com/user-attachments/assets/3aac69a1-3ec3-4909-872f-fd4e1032012e)

