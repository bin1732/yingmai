// 店铺接入教程：双语、标注更新日期与官方链接，支持从项目仓库检查更新。
// 灵感引擎工坊 · bin1732

const TUTORIALS = {
  shopify: {
    updated: '2026-10-06',
    intro: {
      zh: '通过在 Shopify 后台创建仅用于读取的自定义应用，把商品、订单与库存同步到盈脉。整个过程约 3 分钟，无需编程。',
      en: 'Create a read-only custom app in your Shopify admin to sync products, orders and inventory into YingMai. It takes about 3 minutes and requires no coding.',
    },
    scopes: ['read_products', 'read_orders', 'read_inventory', 'read_locations'],
    steps: [
      {
        h: { zh: '打开开发应用入口', en: 'Open the app development area' },
        d: {
          zh: '登录 Shopify 后台，点击左下角「设置」→「应用和销售渠道」，再点击「开发应用」。',
          en: 'Sign in to your Shopify admin, click “Settings” in the lower left → “Apps and sales channels”, then click “Develop apps”.',
        },
      },
      {
        h: { zh: '创建应用', en: 'Create an app' },
        d: {
          zh: '点击「创建应用」，名称可填写“盈脉”，然后确认创建。',
          en: 'Click “Create an app”, name it “YingMai”, then confirm.',
        },
      },
      {
        h: { zh: '配置读取权限', en: 'Configure read permissions' },
        d: {
          zh: '切换到「配置 Admin API 权限范围」，勾选商品、订单、库存与地点的读取权限（read_products、read_orders、read_inventory、read_locations），然后保存。',
          en: 'Go to “Configure Admin API scopes” and enable read access for products, orders, inventory and locations (read_products, read_orders, read_inventory, read_locations), then save.',
        },
      },
      {
        h: { zh: '安装应用', en: 'Install the app' },
        d: {
          zh: '点击右上角「安装应用」并确认，使权限生效。',
          en: 'Click “Install app” in the top right and confirm to activate the permissions.',
        },
      },
      {
        h: { zh: '复制访问令牌', en: 'Copy the access token' },
        d: {
          zh: '安装后在「API 凭据」中找到「Admin API 访问令牌」，点击显示并立即复制（以 shpat_ 开头，仅显示一次）。',
          en: 'After installation, find “Admin API access token” under “API credentials”, reveal it and copy it now (it starts with shpat_ and is shown only once).',
        },
      },
      {
        h: { zh: '填入盈脉并测试', en: 'Enter it in YingMai and test' },
        d: {
          zh: '回到盈脉的连接窗口，店铺域名填写店铺名称（无需 .myshopify.com），粘贴访问令牌，点击「测试连接」。',
          en: 'Return to the YingMai connection window, enter your store name as the domain (without .myshopify.com), paste the token, and click “Test connection”.',
        },
      },
      {
        h: { zh: '保存并完成', en: 'Save and finish' },
        d: {
          zh: '提示连接成功后点击「保存并连接」，工作台会开始首次同步；随后可在「店铺商品」与「订单管理」中查看。',
          en: 'Once connected, click “Save & connect”; the first sync begins. View results under “Store products” and “Orders”.',
        },
      },
    ],
    notes: [
      {
        zh: '默认仅可读取最近 60 天的订单；如需更早的订单，需申请 read_all_orders 权限并经 Shopify 审核。',
        en: 'By default only orders from the last 60 days are readable; for older orders, request the read_all_orders scope, which requires Shopify approval.',
      },
      {
        zh: '访问令牌仅显示一次；如遗失，可在应用页面重新安装后获取新令牌。',
        en: 'The access token is shown only once; if lost, reinstall the app on its page to obtain a new one.',
      },
      {
        zh: '令牌经加密后仅保存在您的电脑，不会上传；仅勾选读取权限即可，无需写入权限。',
        en: 'The token is encrypted and stored only on your computer and is never uploaded; read permissions are sufficient—write permissions are not needed.',
      },
    ],
  },
  amazon: {
    updated: '2026-10-07',
    intro: {
      zh: '把您自己的 Amazon 店铺商品、订单与 FBA 库存同步到盈脉。整个过程在 Amazon 与 AWS 官网完成，盈脉只在本机用您自己的凭证直连，不需要公网回调地址。',
      en: 'Sync products, orders and FBA inventory from your own Amazon shop into YingMai. Setup happens on the Amazon and AWS sites; YingMai connects locally with your own credentials and needs no public callback URL.',
    },
    scopes: [
      'orders:read', 'orderItems:read', 'sellers:read',
      'fbaInventory:read', 'reports:read',
    ],
    steps: [
      {
        h: { zh: '注册 SP-API 开发者', en: 'Register as an SP-API developer' },
        d: {
          zh: '登录 developer.amazon.com，进入 Seller Central 的「开发应用（Develop Apps）」，按提示完成开发者资料注册。个人、个体工商户、企业与工作室均可申请，资料审核以 Amazon 为准。',
          en: 'Sign in at developer.amazon.com, open “Develop Apps” in Seller Central, and complete the developer profile. Individuals, sole proprietors, companies and studios may apply; profile review is at Amazon’s discretion.',
        },
      },
      {
        h: { zh: '创建私有应用', en: 'Create a private application' },
        d: {
          zh: '在开发应用页面创建应用，类型选择私有应用（Private Developer），并勾选订单、商品、库存与报表的读取权限。创建后在「App 凭据」中记录 LWA Client ID 与 Client Secret。',
          en: 'Create an application as a Private Developer, enable read permissions for orders, products, inventory and reports, then copy the LWA Client ID and Client Secret from the app credentials.',
        },
      },
      {
        h: { zh: '在 AWS 配置 IAM 用户', en: 'Configure an IAM user in AWS' },
        d: {
          zh: '在 AWS 控制台创建一个 IAM 用户，为其生成 Access Key ID 与 Secret Access Key，并在 SP-API 应用的「角色凭证 / 用户 ARN」处填入该 IAM 用户的 ARN，使该密钥可调用 SP-API。',
          en: 'Create an IAM user in the AWS Console, generate an Access Key ID and Secret Access Key for it, and attach that IAM user ARN to your SP-API app’s role/user settings so the key can call the SP-API.',
        },
      },
      {
        h: { zh: '自助授权获取 Refresh Token', en: 'Self-authorize to get a refresh token' },
        d: {
          zh: '回到 Seller Central「开发应用」，找到您的应用并点击「Authorize app」（需为主账号 Primary User）。本机无需公网回调地址：授权后页面会直接给出一个以 Atzr| 开头的 Refresh Token，复制保存。',
          en: 'Back in Seller Central “Develop Apps”, find your app and click “Authorize app” (you must be the Primary User). No public callback URL is needed: after authorizing, a refresh token starting with Atzr| is shown directly—copy and save it.',
        },
      },
      {
        h: { zh: '确认售卖区域与 Marketplace ID', en: 'Confirm region and marketplace ID' },
        d: {
          zh: '按店铺所在站点选择区域：北美 NA、欧洲 EU、远东 FE。Marketplace ID 可留空（按区域默认），如美国站为 ATVPDKIKX0DER；多站点时按实际站点填写对应 ID。',
          en: 'Choose your region: North America (NA), Europe (EU), or Far East (FE). You can leave Marketplace ID blank to use the region default (e.g. US = ATVPDKIKX0DER), or enter the ID of your actual marketplace.',
        },
      },
      {
        h: { zh: '填入盈脉并测试连接', en: 'Enter credentials in YingMai and test' },
        d: {
          zh: '在盈脉的 Amazon 连接窗口依次填写区域、Marketplace ID（可空）、Seller ID、LWA Client ID、Client Secret、Refresh Token、AWS Access Key ID 与 Secret Key，点击「测试连接」。',
          en: 'In YingMai’s Amazon connection dialog, enter the region, Marketplace ID (optional), Seller ID, LWA Client ID, Client Secret, refresh token, AWS Access Key ID and Secret Access Key, then click “Test connection”.',
        },
      },
      {
        h: { zh: '保存并完成', en: 'Save and finish' },
        d: {
          zh: '测试通过后点击「保存并连接」，工作台会开始首次同步；随后可在「店铺商品」「订单管理」与库存中查看。',
          en: 'Once the test passes, click “Save & connect”; the first sync begins. View results under “Store products”, “Orders” and inventory.',
        },
      },
    ],
    notes: [
      {
        zh: '买家姓名、地址、电话等 PII 需要 Restricted Data Token（RDT）并可能通过额外审核；本适配器默认不申请 RDT，这些字段留空，不会中断同步。',
        en: 'Buyer PII such as name, address and phone requires a Restricted Data Token (RDT) and may need additional review. This adapter does not request an RDT by default, so these fields are left blank and sync is not interrupted.',
      },
      {
        zh: '读取订单、商品等权限通常无需应用上架审核；但若需要读取 PII 或历史订单等受限数据，Amazon 可能要求额外的角色审核，以 Seller Central 提示为准。',
        en: 'Standard read access for orders and products usually does not require app review; restricted data such as PII or older orders may require additional role approval, as indicated in Seller Central.',
      },
      {
        zh: '所有凭证经加密后仅保存在您的本机，不会上传；Refresh Token 与各类密钥仅在本机用于换取访问令牌，内存中的访问令牌不会写入磁盘。',
        en: 'All credentials are encrypted and stored only on your computer and are never uploaded. The refresh token and keys are used locally to obtain access tokens; in-memory access tokens are never written to disk.',
      },
      {
        zh: '个人、个体工商户可注册为开发者并自助授权；企业与工作室流程相同，仅在资料审核材料上有所不同。',
        en: 'Individuals and sole proprietors can register as developers and self-authorize; companies and studios follow the same flow with different verification materials.',
      },
    ],
  },
  ebay: {
    updated: '2026-10-07',
    intro: {
      zh: '把您自己的 eBay 店铺商品、订单与库存同步到盈脉。整个过程在 eBay Developer Portal 网页完成，盈脉只在本机用您自己的 App ID、Cert ID 与 User Refresh Token 直连，不需要公网回调地址。',
      en: 'Sync products, orders and inventory from your own eBay shop into YingMai. Setup happens on the eBay Developer Portal; YingMai connects locally with your own App ID, Cert ID and user refresh token and needs no public callback URL.',
    },
    scopes: [
      'sell.inventory.readonly', 'sell.fulfillment.readonly', 'sell.account.readonly',
    ],
    steps: [
      {
        h: { zh: '注册 eBay 开发者账号', en: 'Register as an eBay developer' },
        d: {
          zh: '访问 developer.ebay.com 加入 eBay Developers Program，用常用邮箱注册并接受 API 协议。个人、个体工商户、企业与工作室均可申请，资料审核约 1 个工作日，以 eBay 为准。',
          en: 'Visit developer.ebay.com and join the eBay Developers Program with a regular email, accepting the API license agreement. Individuals, sole proprietors, companies and studios may apply; review takes about one business day, at eBay’s discretion.',
        },
      },
      {
        h: { zh: '生成 Production keyset', en: 'Create your Production keyset' },
        d: {
          zh: '进入 Application Keys 页面，找到（或新建）Production 环境的 keyset，记录 App ID（即 Client ID）与 Cert ID（即 Client Secret）。REST 接口不需要 Dev ID。如需先测试，可使用 Sandbox keyset。',
          en: 'Open the Application Keys page, find (or create) your Production keyset, and note the App ID (Client ID) and Cert ID (Client Secret). Dev ID is not needed for REST calls. You may use the Sandbox keyset for early testing.',
        },
      },
      {
        h: { zh: '在网页完成一次授权，取 User Refresh Token', en: 'Authorize on the web to get a user refresh token' },
        d: {
          zh: '在 Application Keys 页点 App ID 旁的 User Tokens，选择 OAuth (new security)，登录您要同步的 eBay 卖家账号并在 Grant Application Access 页点 Agree，授予商品、订单与账户的只读权限（sell.inventory.readonly、sell.fulfillment.readonly、sell.account.readonly）。页面会返回 User access token；请在“See all”/示例请求中找到并复制 User Refresh Token（有效期约 18 个月）。本机无需公网地址：后续续期是盈脉直接向 eBay 令牌端点 POST，不依赖 localhost 回调。',
          en: 'Next to your App ID, open User Tokens, choose OAuth (new security), sign in with the eBay seller account you want to sync, and click Agree on the Grant Application Access page to grant read access for inventory, orders and account (sell.inventory.readonly, sell.fulfillment.readonly, sell.account.readonly). The page returns a user access token; find and copy the user refresh token under “See all” / the sample request (valid about 18 months). No public address is needed: later renewals are a direct POST from YingMai to eBay’s token endpoint and do not rely on a localhost callback.',
        },
      },
      {
        h: { zh: '备选：用 RuName 默认页手动粘贴授权码', en: 'Alternative: paste the code manually via the default page' },
        d: {
          zh: '若 Portal 未直接展示 Refresh Token，可新建一个 Redirect URL（RuName），把 Auth Accepted / Declined URL 留空（官方会使用 eBay 默认接受/拒绝页），在浏览器打开 authorize 链接并同意，授权码会显示在 eBay 默认页上，手动复制后用 App ID/Cert ID 换取 Refresh Token。',
          en: 'If the portal does not show a refresh token directly, create a Redirect URL (RuName) and leave the Auth Accepted / Declined URLs blank (eBay then uses its own default pages). Open the authorize link in a browser, agree, and the authorization code appears on eBay’s default page; copy it manually and exchange it with your App ID/Cert ID for a refresh token.',
        },
      },
      {
        h: { zh: '确认 Marketplace ID', en: 'Confirm your Marketplace ID' },
        d: {
          zh: '按您的主站填写 Marketplace ID，默认 EBAY_US；英国站 EBAY_GB、德国站 EBAY_DE、澳洲站 EBAY_AU 等。一个连接对应一个主站；多站点可建多个连接。',
          en: 'Enter the Marketplace ID of your primary site (default EBAY_US; e.g. EBAY_GB for the UK, EBAY_DE for Germany, EBAY_AU for Australia). One connection maps to one primary marketplace; add multiple connections for several sites.',
        },
      },
      {
        h: { zh: '填入盈脉并测试连接', en: 'Enter credentials in YingMai and test' },
        d: {
          zh: '在盈脉的 eBay 连接窗口依次填写环境（默认 production）、Marketplace ID、App ID、Cert ID、User Refresh Token，点击「测试连接」。',
          en: 'In YingMai’s eBay connection dialog, enter the environment (production by default), Marketplace ID, App ID, Cert ID and user refresh token, then click “Test connection”.',
        },
      },
      {
        h: { zh: '保存并完成', en: 'Save and finish' },
        d: {
          zh: '测试通过后点击「保存并连接」，工作台会开始首次同步；随后可在「店铺商品」「订单管理」与库存中查看。',
          en: 'Once the test passes, click “Save & connect”; the first sync begins. View results under “Store products”, “Orders” and inventory.',
        },
      },
    ],
    notes: [
      {
        zh: 'Refresh Token 约 18 个月有效；卖家修改 eBay 用户名/密码或在 My eBay 手动撤销第三方授权后会失效，届时需回到 Developer Portal 重做一次网页授权。',
        en: 'The refresh token is valid about 18 months. It is invalidated if the seller changes their eBay username/password or revokes third-party access in My eBay; repeat the web consent on the Developer Portal when that happens.',
      },
      {
        zh: '商品/库存接口（Sell Inventory）只覆盖经 Inventory API 建立或迁移的 listing；早期手工或用其他工具刊登的旧 listing 可能看不到，需先迁移或改用 Sell Feed API 批量报表。',
        en: 'The product/inventory API (Sell Inventory) only covers listings created or migrated via the Inventory API. Older listings created manually or with other tools may not appear until migrated, or you may need the Sell Feed API bulk reports.',
      },
      {
        zh: 'EU/UK 卖家调用结算（Finances）等接口需 Digital Signatures（PSD2 支付合规）；本适配器默认只读商品/订单/库存，不做写入，也不实现数字签名。',
        en: 'EU/UK sellers need Digital Signatures (PSD2) for finances and similar calls. This adapter reads products/orders/inventory only, performs no writes, and does not implement digital signatures.',
      },
      {
        zh: '所有凭证经加密后仅保存在您的本机，不会上传；User Refresh Token 与 Cert ID 仅在本机用于换取访问令牌，内存中的访问令牌（约 2 小时）不会写入磁盘。',
        en: 'All credentials are encrypted and stored only on your computer and are never uploaded. The refresh token and Cert ID are used locally to obtain access tokens; the in-memory access token (about 2 hours) is never written to disk.',
      },
      {
        zh: '订单接口仅返回买家 eBay 用户名与收货地址，不返回买家邮箱与电话，这些字段将留空，不会中断同步。',
        en: 'The order API returns only the buyer’s eBay username and shipping address, not the buyer’s email or phone; those fields are left blank and sync is not interrupted.',
      },
    ],
  },
  shopee: {
    updated: '2026-10-07',
    intro: {
      zh: '把您自己的 Shopee（虾皮）店铺商品、订单与库存同步到盈脉。需要先在 Shopee Open Platform 注册开发者并创建自用应用，盈脉之后在本机用您自己的 Partner ID/Key 与店铺授权令牌直连，不需要公网服务器。',
      en: 'Sync products, orders and inventory from your own Shopee shop into YingMai. First register as a Shopee Open Platform developer and create a Seller In-house app; YingMai then connects locally with your own Partner ID/key and shop access token—no public server needed.',
    },
    scopes: [
      'shop.get_shop_info',
      'product.get_item_list / get_item_base_info / get_model_list',
      'order.get_order_list / get_order_detail',
    ],
    steps: [
      {
        h: { zh: '注册 Shopee 开发者账号', en: 'Register as a Shopee developer' },
        d: {
          zh: '访问 open.shopee.com，用您要同步的店铺卖家账号登录并完成开发者资料注册，账户类型选择 Seller In-house System（自用店铺）。个人（Individual Seller）、个体工商户与企业（Registered Business Seller）均可申请；Seller 类资料审核约 7 个工作日。注意：巴西站已关闭 Individual Seller 类型。',
          en: 'Visit open.shopee.com, sign in with the seller account you want to sync, and complete the developer profile as a Seller In-house System app. Individuals (Individual Seller), sole proprietors and Registered Business Sellers may apply; Seller-type review takes about 7 business days. Note: the Individual Seller type is closed on the Brazil site.',
        },
      },
      {
        h: { zh: '创建 Seller In-house App 并取 Test 凭证', en: 'Create a Seller In-house app and get test credentials' },
        d: {
          zh: '开发者资料审核通过后，在 My Apps 新建应用，类型选 Seller In-house System。创建后先拿到 Test Partner_id 与 Test Key，仅用于沙箱联调。记录 Partner ID 与 Partner Key。',
          en: 'Once your profile is approved, create a new app in My Apps as a Seller In-house System. You first receive a Test Partner_id and Test Key for sandbox testing. Note the Partner ID and Partner Key.',
        },
      },
      {
        h: { zh: '沙箱联调', en: 'Test in the sandbox' },
        d: {
          zh: '在盈脉连接窗口把环境选 sandbox，填入 Test Partner ID/Key，并按下一步流程完成一次沙箱店铺授权，确认能取到 Access Token 并成功读取店铺信息。',
          en: 'In YingMai’s connection dialog, set the environment to sandbox, enter the test Partner ID/Key, complete a sandbox shop authorization per the next step, and confirm you can obtain an access token and read shop info.',
        },
      },
      {
        h: { zh: 'Go Live 取得 Live 凭证', en: 'Go Live to obtain live credentials' },
        d: {
          zh: '联调通过后在应用页面提交 Go Live，约 24 小时自动过审；通过后在 App 的 App Key 区可见 Live Partner_id 与 Live Key，用于生产环境。把盈脉环境切回 production。',
          en: 'Once sandbox works, submit your app for Go Live; review is automatic within about 24 hours. After approval, the App Key section shows the live Partner_id and Partner Key for production. Switch YingMai’s environment back to production.',
        },
      },
      {
        h: { zh: '本机无公网：留空回调域名、用 https 中转页面完成授权', en: 'No public IP: leave the callback blank and authorize via an https placeholder' },
        d: {
          zh: '在应用后台把“回调 URL 域名”留空（留空时平台不校验 redirect 域名）。由盈脉按您的 Partner ID/Key 生成授权链接，redirect 填一个 https 中转页面地址（如 https://www.baidu.com/）。在浏览器打开该链接，选区域、登录本店账号并确认授权，浏览器会跳到该中转页面，地址栏形如 https://www.baidu.com/?code=xxxx&shop_id=38862，手动把整段地址里的 code 与 shop_id 复制回来。code 约 10 分钟内有效。',
          en: 'Leave the “callback URL domain” blank in your app settings (when blank, Shopee does not validate the redirect domain). YingMai builds an authorization link from your Partner ID/Key with an https placeholder redirect (e.g. https://www.baidu.com/). Open the link in a browser, pick your region, sign in with your shop account and confirm; you land on the placeholder URL, whose address bar looks like https://www.baidu.com/?code=xxxx&shop_id=38862. Copy the code and shop_id back manually. The code is valid for about 10 minutes.',
        },
      },
      {
        h: { zh: '换取令牌并填入盈脉测试', en: 'Exchange the code for tokens and test in YingMai' },
        d: {
          zh: '用 code + shop_id + Partner ID/Key 调 /api/v2/auth/token/get 换得 Access Token 与 Refresh Token（可在盈脉教程界面或自行用工具完成这一步）。回到盈脉连接窗口：环境选 production、位置选您的店铺所在位置（global/cn/br），填入 Partner ID、Partner Key、Shop ID、Access Token 与 Refresh Token，点击「测试连接」。',
          en: 'Exchange the code with shop_id and your Partner ID/Key at /api/v2/auth/token/get to obtain an access token and refresh token (YingMai’s guided UI or your own tooling can do this). Back in YingMai, set environment to production, pick your shop location (global/cn/br), enter the Partner ID, Partner Key, Shop ID, Access Token and Refresh Token, then click “Test connection”.',
        },
      },
      {
        h: { zh: '保存并完成', en: 'Save and finish' },
        d: {
          zh: '测试通过后点击「保存并连接」，工作台会开始首次同步；随后可在「店铺商品」「订单管理」与库存中查看。',
          en: 'Once the test passes, click “Save & connect”; the first sync begins. View results under “Store products”, “Orders” and inventory.',
        },
      },
    ],
    notes: [
      {
        zh: 'Refresh Token 30 天有效且仅能使用一次，每次刷新都会换发新的一对 Access/Refresh Token；盈脉会在本机自动轮换并用加密保存新对。长期不调用会导致授权断开，保持连接定期同步即可。',
        en: 'The refresh token is valid 30 days and is one-time: each refresh returns a brand-new access/refresh pair. YingMai rotates it locally and re-encrypts the new pair. A long idle period invalidates authorization, so keep the connection syncing periodically.',
      },
      {
        zh: '部分接口可能要求在开发者后台申报出口 IP（错误 source_ip_undeclared）；桌面单机若使用家庭动态 IP，遇此错误需在控制台补报当前出口 IP。',
        en: 'Some APIs require you to whitelist your outbound IP in the developer console (error source_ip_undeclared). On a home dynamic IP, add the current outbound IP when you hit this error.',
      },
      {
        zh: '巴西站已关闭 Individual Seller 开发者类型；本土店与跨境店（中国大陆走 openplatform.shopee.cn）在接口上共用同一套 v2 接口，店铺区域与币种以 get_shop_info 返回为准。',
        en: 'The Individual Seller developer type is closed on the Brazil site. Domestic and cross-border shops (China via openplatform.shopee.cn) share the same v2 APIs; the shop’s region and currency come from get_shop_info.',
      },
      {
        zh: '所有凭证经加密后仅保存在您的本机，不会上传；Access Token 约 4 小时有效、仅在内存中缓存，Refresh Token 与 Partner Key 仅在本机用于签名与换令牌。',
        en: 'All credentials are encrypted and stored only on your computer and are never uploaded. The access token lasts about 4 hours and is cached in memory only; the refresh token and Partner Key are used locally for signing and token renewal.',
      },
      {
        zh: '个人、个体工商户可注册开发者并创建自用应用；企业与工作室流程相同，仅在资料审核材料上有所不同。对接多个卖家店铺（SaaS）才需要 ISV（ERP System）资质，本连接器面向您自己的店铺。',
        en: 'Individuals and sole proprietors can register as developers and create in-house apps; companies and studios follow the same flow with different review materials. Serving multiple sellers (SaaS) requires ISV/ERP System status; this connector targets your own shop.',
      },
    ],
  },
  aliexpress: {
    updated: '2026-10-07',
    intro: {
      zh: '把您自己的速卖通（AliExpress）店铺商品、订单与库存同步到盈脉。速卖通自研接入面向企业卖家：需先以企业主体创建“商家自研系统”应用、入驻聚石塔并通过审核，拿到 AppKey/AppSecret 后完成店铺授权，盈脉再在本机用您自己的凭证直连。',
      en: 'Sync products, orders and inventory from your own AliExpress shop into YingMai. AliExpress in-house integration targets enterprise sellers: first create a “Merchant In-house System” app as an enterprise, onboard to Jushita and pass review, obtain the AppKey/AppSecret, authorize your shop, and YingMai then connects locally with your own credentials.',
    },
    scopes: [
      'postproduct.redefining.findproductinfolistquery',
      'postproduct.redefining.findaeproductbyid',
      'trade.seller.orderlist.get',
      'solution.order.info.get',
    ],
    steps: [
      {
        h: { zh: '注册速卖通企业账号', en: 'Register an AliExpress enterprise account' },
        d: {
          zh: '用企业支付宝注册并认证速卖通企业卖家账号，登录开发者后台。自研接入必须为企业主体、上传企业营业执照；纯个人（无营业执照）无法自助对接本店经营 API。个体工商户能否按“企业”主体过审，官方文档未单列，需在入驻时与小二确认。',
          en: 'Register and verify an AliExpress enterprise seller account with a corporate Alipay, then sign in to the developer console. In-house integration requires an enterprise entity and a business license; pure individuals (no license) cannot self-connect to store APIs. Whether sole proprietorships pass as the “enterprise” entity is not specified in official docs—confirm with support during onboarding.',
        },
      },
      {
        h: { zh: '新建“AliExpress-商家自研系统”应用并提交资质', en: 'Create a “Merchant In-house System” app and submit materials' },
        d: {
          zh: '在开发者后台新建应用，电商后台一级类目选“速卖通”，应用类型选“AliExpress-商家自研系统”。按要求提交产品说明书：调用 API 清单、系统架构、功能截图、自研软件著作权与自研源代码。授权仅适用于您自己企业下的店铺。',
          en: 'Create a new app in the developer console, pick “AliExpress” under the e-commerce category, and choose the “Merchant In-house System” app type. Submit the product brief: API list, system architecture, screenshots, software copyright and your own source code. Authorization covers only shops under your own enterprise.',
        },
      },
      {
        h: { zh: '入驻聚石塔并等待审核', en: 'Onboard to Jushita and wait for review' },
        d: {
          zh: '按指引入驻聚石塔。资料审核约 7 个工作日（非自然日），授权报备绑定店铺（填写 cn+数字 形式的卖家 ID、上传店铺营业执照）同样约 7 个工作日。审核通过后在应用概览拿到正式环境 AppKey 与 AppSecret。',
          en: 'Follow the steps to onboard to Jushita. Material review takes about 7 business days (not calendar days); binding your shop (enter the seller ID in the form cn+digits and upload the shop business license) takes about another 7 business days. Once approved, copy the production AppKey and AppSecret from the app overview.',
        },
      },
      {
        h: { zh: 'OAuth 授权取得 Access Token', en: 'Authorize via OAuth to get an access token' },
        d: {
          zh: '在浏览器打开授权链接（盈脉按您的 AppKey 生成）：https://oauth.aliexpress.com/authorize?response_type=code&client_id=您的AppKey&redirect_uri=注册的回调地址&sp=ae&view=web 。登录本店账号并同意授权后，平台在回调地址上带回 code。本机无公网服务器：回环（127.0.0.1）回调是否被官方允许需在应用设置实测；若不允许，就把 redirect 配成您能控制的页面，手动从地址栏复制整段 code。code 约 3 分钟有效、一次性，须立刻换 token。',
          en: 'Open the authorization link in a browser (YingMai builds it from your AppKey): https://oauth.aliexpress.com/authorize?response_type=code&client_id=YOUR_APPKEY&redirect_uri=YOUR_REGISTERED_REDIRECT&sp=ae&view=web. Sign in with your shop account and agree; the platform returns a code on the redirect URL. With no public server: whether a loopback (127.0.0.1) redirect is allowed must be tested in your app settings; if not, point redirect to a page you control and copy the code from the address bar. The code is valid about 3 minutes and is single-use—exchange it immediately.',
        },
      },
      {
        h: { zh: '用 code 换 Access Token', en: 'Exchange the code for an access token' },
        d: {
          zh: '在本机向 https://oauth.aliexpress.com/token 发一次表单 POST（grant_type=authorization_code、client_id=AppKey、client_secret=AppSecret、code、redirect_uri、sp=ae），返回 access_token（即调用经营 API 时的 session）。商家后台自研应用上线后 token 约 1 年长效，官方称无需刷新；过期或失效后请重新走一次上面的授权。',
          en: 'From your machine, POST a form to https://oauth.aliexpress.com/token (grant_type=authorization_code, client_id=AppKey, client_secret=AppSecret, code, redirect_uri, sp=ae) to obtain the access_token (used as the session when calling business APIs). For live merchant in-house apps the token lasts about 1 year and needs no refresh; if it expires or is rejected, repeat the authorization above.',
        },
      },
      {
        h: { zh: '填入盈脉并测试连接', en: 'Enter credentials in YingMai and test' },
        d: {
          zh: '在盈脉的 AliExpress 连接窗口填写 TOP 网关（eco 国内 / api 海外，默认 eco）、Seller ID（cn+数字，可空，仅用于展示店铺名）、App Key、App Secret、Access Token，点击「测试连接」。测试会用只读的商品列表接口（第 1 页 1 条）校验 AppKey、签名与 token。',
          en: 'In YingMai’s AliExpress dialog, enter the TOP gateway (eco for China / api for overseas, eco by default), Seller ID (cn+digits, optional, display only), App Key, App Secret and Access Token, then click “Test connection”. The test calls the read-only product list API (page 1, 1 item) to verify the AppKey, signature and token.',
        },
      },
      {
        h: { zh: '保存并完成', en: 'Save and finish' },
        d: {
          zh: '测试通过后点击「保存并连接」，工作台会开始首次同步；随后可在「店铺商品」「订单管理」与库存中查看。',
          en: 'Once the test passes, click “Save & connect”; the first sync begins. View results under “Store products”, “Orders” and inventory.',
        },
      },
    ],
    notes: [
      {
        zh: '个人无法自助接入：本店自研经营 API 明确要求企业主体、企业营业执照与聚石塔入驻；个体工商户是否等同“企业”以官方审核为准。对接多个卖家店铺（SaaS）还需服务商资质，本连接器面向您自己的店铺。',
        en: 'Individuals cannot self-connect: store in-house APIs explicitly require an enterprise entity, a business license and Jushita onboarding; whether sole proprietorships count as “enterprise” is up to platform review. Serving multiple sellers (SaaS) also needs provider status; this connector targets your own shop.',
      },
      {
        zh: '聚石塔出口限制（待实测）：多个经营 API 标注“聚石塔内调用”。本机直连 eco.taobao.com 是否被放行、是否限制出口 IP，需拿到测试 AppKey 后实测；若强制聚石塔内网，本机直连架构可能需要调整。',
        en: 'Jushita egress restriction (to be tested): several business APIs are marked “call within Jushita”. Whether a local desktop can reach eco.taobao.com directly, and whether outbound IP whitelisting is required, must be tested with a real test AppKey; if Jushita intranet is enforced, the local-direct architecture may need adjustment.',
      },
      {
        zh: '双时区：签名 timestamp 用 GMT+8；订单查询的 create/modified 时间用美国太平洋时间（PST/PDT），盈脉已用浏览器时区库自动换算，请勿手工混淆。',
        en: 'Two time zones: the signature timestamp uses GMT+8, while order query create/modified times use US Pacific time (PST/PDT). YingMai converts automatically; do not mix them manually.',
      },
      {
        zh: '订单增量口径：modified 增量必须同时带 create 时间窗口（未结束订单 ≤180 天、已结束 FINISH ≤30 天）；不传 order_status 默认不含 FINISH 已结束订单，盈脉会显式补查 FINISH。',
        en: 'Order incremental rule: a modified-date query must also pass a create-date window (unfinished orders ≤180 days, finished FINISH orders ≤30 days). Without order_status the response excludes FINISH orders; YingMai additionally queries FINISH explicitly.',
      },
      {
        zh: '商品与订单金额以美元（USD）为主，实际币种以接口返回的 currency_code 为准（可能为 EUR/RUB 等）。买家邮箱不返回，留空不中断同步。',
        en: 'Product and order amounts are mainly USD; the actual currency follows the returned currency_code (possibly EUR/RUB, etc.). The buyer email is not returned and is left blank without breaking sync.',
      },
      {
        zh: '所有凭证经加密后仅保存在您的本机，不会上传；App Secret 仅在本机用于 HMAC 签名，Access Token（约 1 年）仅在内存与本机加密保存，过期后重新授权即可。',
        en: 'All credentials are encrypted and stored only on your computer and are never uploaded. The App Secret is used locally for HMAC signing; the access token (about 1 year) is held in memory and encrypted on disk. Re-authorize when it expires.',
      },
    ],
  },
  tiktokshop: {
    updated: '2026-10-07',
    intro: {
      zh: '把您自己的 TikTok Shop 店铺商品、订单与库存同步到盈脉。需要先在 Partner Center 注册开发者、创建 Custom App 并通过卖家自用合规审核，拿到 App Key/Secret 后完成店铺授权；盈脉之后在本机用您自己的凭证直连全球统一 API，不需要公网服务器。',
      en: 'Sync products, orders and inventory from your own TikTok Shop into YingMai. First register as a Partner Center developer, create a Custom app and pass seller-in-use compliance review to obtain the App Key/secret, then authorize your shop. YingMai then connects locally to the unified global API with your own credentials—no public server needed.',
    },
    scopes: [
      'seller.authorization',
      'seller.product.basic',
      'seller.order',
    ],
    steps: [
      {
        h: { zh: '注册 Partner Center 开发者', en: 'Register as a Partner Center developer' },
        d: {
          zh: '访问 partner.tiktokshop.com，用您要同步的卖家账号注册并登记为开发者。个人、个体工商户、企业与工作室均可申请；本连接器面向您自己的店铺（seller 自用），不是对接多个卖家的服务商（ISV）。',
          en: 'Visit partner.tiktokshop.com, sign in with the seller account you want to sync, and enroll as a developer. Individuals, sole proprietors, companies and studios may apply. This connector is for your own shop (seller in use), not for serving multiple sellers (ISV).',
        },
      },
      {
        h: { zh: '完成卖家自用 security/合规审核（前置、约 3 周以上）', en: 'Pass seller-in-use security/compliance review (prerequisite, about 3+ weeks)' },
        d: {
          zh: '卖家自用的安全/合规审核为强制项，US/UK 市场总是强制，其他市场按情况；周期约 3 周以上。审核表格需用英文如实填写用途、店铺与数据范围；连续 3 次被拒绝会导致账号被拉黑，请务必如实、完整填写。审核通过前 App 无法正式授权店铺。',
          en: 'Security/compliance review is mandatory for seller-in-use apps, always required in the US/UK and case-by-case elsewhere; it takes about 3 weeks or more. Fill the review form in English, truthfully describing your use case, shops and data scope. Three consecutive rejections can get the account blacklisted, so complete it accurately. Your app cannot authorize shops until review passes.',
        },
      },
      {
        h: { zh: '创建 Custom App 并取 App Key/Secret', en: 'Create a Custom app and get the App Key/secret' },
        d: {
          zh: '审核通过后在 App & Service 新建应用，分发方式选 Private authorization link（Custom，私下自用）。在 App details 页记录 App Key，并点 Manage app secret 查看 App Secret。在 Manage API 里启用商品、订单、库存的读取权限（seller.product.basic、seller.order 等）。',
          en: 'After approval, create an app under App & Service and choose Private authorization link (Custom, in-house use). Note the App Key on the App details page and reveal the App Secret via “Manage app secret”. Enable read access for products, orders and inventory (seller.product.basic, seller.order, etc.) under Manage API.',
        },
      },
      {
        h: { zh: '配置 Redirect URL（本机无公网：https 中转页面 + 人工复制 code）', en: 'Configure the Redirect URL (no public IP: https placeholder + copy the code manually)' },
        d: {
          zh: '在应用配置页把 Redirect URL 填成一个您能打开的 https 中转页面地址（公网可达即可，无需在该页面做任何处理）。用 Partner Center 上 “Copy authorization link” 给出的真实授权链接（service_id 以控制台为准；美国站走 services.us.tiktokshop.com，其余市场走 services.tiktokshop.com）在浏览器打开，登录本店账号并同意授权。浏览器会跳到该中转页面，地址栏形如 https://中转页面地址/?code=xxxx&state=xxxx，手动把整段 code 复制回来。code 30 分钟内有效、一次性。是否允许 http://127.0.0.1 回环回调官方未明确，需在应用设置实测；人工复制 code 是较为稳妥的方式。',
          en: 'Set the Redirect URL in your app settings to any https placeholder page that opens in a browser (it only needs to be publicly reachable; nothing listens on it). Open the real authorization link from Partner Center’s “Copy authorization link” (service_id as shown in the console; US uses services.us.tiktokshop.com, other markets use services.tiktokshop.com), sign in with your shop account and agree. You land on the placeholder URL, whose address bar looks like https://placeholder/?code=xxxx&state=xxxx—copy the code back manually. The code is valid 30 minutes and is single-use. Whether an http://127.0.0.1 loopback redirect is allowed is not clearly specified officially and must be tested in app settings; copying the code manually is the safe fallback.',
        },
      },
      {
        h: { zh: '用 code 在本机换取令牌', en: 'Exchange the code for tokens on your machine' },
        d: {
          zh: '拿到 code 后尽快（30 分钟内）在本机向 https://auth.tiktok-shops.com/api/v2/token/get 发一次 GET（app_key、app_secret、auth_code=code、grant_type=authorized_code），返回 access_token、refresh_token 及各自的过期时间戳（access_token_expire_in / refresh_token_expire_in，Unix epoch 秒）。盈脉会按这些时间戳倒计时，到期前自动用 refresh_token 换新，无需写死小时数。',
          en: 'Within 30 minutes, GET https://auth.tiktok-shops.com/api/v2/token/get from your machine (app_key, app_secret, auth_code=code, grant_type=authorized_code). It returns access_token, refresh_token and their expiry timestamps (access_token_expire_in / refresh_token_expire_in, Unix epoch seconds). YingMai counts down by these timestamps and refreshes automatically before expiry—no hard-coded lifetime.',
        },
      },
      {
        h: { zh: '调 Get Authorized Shops 取 shop_cipher', en: 'Call Get Authorized Shops to obtain the shop_cipher' },
        d: {
          zh: '用 access_token 调 GET /authorization/202309/shops，返回 shops[]，记录本店的 cipher（shop_cipher）、id、name、region。中国跨境店必须保存 shop_cipher，它会作为 query 参数参与签名；US/UK/东南亚本土店在多数端点可选，端点要求时才必填。一个 access_token 对应一次授权；跨境店可能一个 token 覆盖多国多店，多店请分别授权、分别建连接。',
          en: 'With the access token, call GET /authorization/202309/shops. Note your shop’s cipher (shop_cipher), id, name and region from shops[]. Cross-border China shops must store the shop_cipher—it is passed as a query parameter and participates in signing. It is optional for most local-shop endpoints in the US/UK/SEA unless an endpoint requires it. One access token is one authorization; a cross-border token may cover several shops across countries—authorize each shop and create a separate connection.',
        },
      },
      {
        h: { zh: '填入盈脉并测试连接', en: 'Enter credentials in YingMai and test' },
        d: {
          zh: '在盈脉的 TikTok Shop 连接窗口依次填写授权区域（us/row，默认 row）、App Key、App Secret、Access Token、Refresh Token、Shop Cipher（跨境店必填）。到期时间戳可留空、由盈脉自动维护，点击「测试连接」。测试会调 Get Authorized Shops 校验签名与令牌。',
          en: 'In YingMai’s TikTok Shop dialog, enter the authorization region (us/row, row by default), App Key, App Secret, Access Token, Refresh Token and Shop Cipher (required for cross-border shops). You may leave the expiry timestamps blank—YingMai maintains them automatically. Click “Test connection”; it calls Get Authorized Shops to verify the signature and token.',
        },
      },
      {
        h: { zh: '保存并完成', en: 'Save and finish' },
        d: {
          zh: '测试通过后点击「保存并连接」，工作台会开始首次同步；随后可在「店铺商品」「订单管理」与库存中查看。',
          en: 'Once the test passes, click “Save & connect”; the first sync begins. View results under “Store products”, “Orders” and inventory.',
        },
      },
    ],
    notes: [
      {
        zh: '过期口径：官方返回的 access_token_expire_in / refresh_token_expire_in 是绝对过期时间戳（Unix epoch 秒），不是时长；盈脉按此倒计时，到期前自动用 refresh_token 换新并加密保存新对，不写死多少小时/天。',
        en: 'Expiry basis: access_token_expire_in / refresh_token_expire_in are absolute expiry timestamps (Unix epoch seconds), not durations. YingMai counts down by them, refreshes automatically before expiry, and re-encrypts the new pair; it does not hard-code hours/days.',
      },
      {
        zh: 'IP 白名单：若 App 配置了 IP allow list，未加白的出口 IP 调用会返回 36009033；桌面单机使用家庭动态 IP 时，可在控制台关闭白名单或把当前出口 IP 加入。调用返回 105005 Access denied 时，先到 Partner Center 确认所需 scope 已启用/申请。',
        en: 'IP allow list: if your app has an IP allow list, calls from a non-whitelisted outbound IP return 36009033. On a home dynamic IP, disable the allow list or add your current outbound IP in the console. On 105005 Access denied, first confirm the required scopes are enabled/requested in Partner Center.',
      },
      {
        zh: '多店：一个 access_token 对应一次卖家授权；跨境（CROSS_BORDER）一个 token 可能覆盖多国多店，需用 Get Authorized Shops 列出并分别保存 shop_cipher；多店请分别授权、分别在盈脉建连接。',
        en: 'Multiple shops: one access token is one seller authorization. A cross-border (CROSS_BORDER) token may cover several shops across countries—list them with Get Authorized Shops and store each shop_cipher separately; authorize and create a separate connection per shop.',
      },
      {
        zh: '业务 API 全球统一 host（open-api.tiktokglobalshop.com），不按美国/东南亚切 host；店铺区域与币种以 Get Authorized Shops 返回的 region 为准（US=USD、GB=GBP、ID=IDR、MY=MYR、PH=PHP、TH=THB、VN=VND、SG=SGD、BR=BRL、MX=MXN，未列出 region 留空）。',
        en: 'Business APIs use a single global host (open-api.tiktokglobalshop.com) and are not split by US/SEA. The shop region and currency follow the region returned by Get Authorized Shops (US=USD, GB=GBP, ID=IDR, MY=MYR, PH=PHP, TH=THB, VN=VND, SG=SGD, BR=BRL, MX=MXN; unlisted regions are left blank).',
      },
      {
        zh: '所有凭证经加密后仅保存在您的本机，不会上传；App Secret 仅在本机用于 HMAC-SHA256 签名，Access/Refresh Token 仅在内存与本机加密保存，不落明文磁盘。',
        en: 'All credentials are encrypted and stored only on your computer and are never uploaded. The App Secret is used locally for HMAC-SHA256 signing; access/refresh tokens are held in memory and encrypted on disk, never written as plaintext.',
      },
      {
        zh: '主体差异：个人、个体工商户、企业与工作室均可在 Partner Center 注册；卖家自用 security/合规审核对 US/UK 总是强制、约 3 周以上，表格如实填写，连续 3 次拒绝会拉黑账号。个人主体能否过审以官方审核为准。',
        en: 'Entity differences: individuals, sole proprietors, companies and studios can all register on Partner Center. Seller-in-use security/compliance review is mandatory in the US/UK and takes about 3+ weeks; fill the form truthfully, as three rejections can blacklist the account. Whether an individual entity passes review is at the platform’s discretion.',
      },
    ],
  },
  lazada: {
    updated: '2026-10-07',
    intro: {
      zh: '把您自己的 Lazada（来赞达）店铺商品、订单与库存同步到盈脉。需要先在 open.lazada.com 走“For Lazada Sellers（自营卖家自用）”通道注册开发者、创建应用并通过 Lazada 管理员人工审核，拿到 App Key/Secret 后完成店铺授权；盈脉之后在本机用您自己的凭证直连对应国家的 API，不需要公网服务器。',
      en: 'Sync products, orders and inventory from your own Lazada shop into YingMai. First register on open.lazada.com via the “For Lazada Sellers” in-house channel, create an app and pass Lazada admin review to obtain the App Key/secret, then authorize your shop. YingMai then connects locally to the API host of your shop’s country with your own credentials—no public server needed.',
    },
    scopes: [
      '/shop/get',
      '/products/get + /product/get',
      '/orders/get + /order/items/get',
      '/inventory/get',
    ],
    steps: [
      {
        h: { zh: '在 open.lazada.com 注册开发者（For Lazada Sellers 自用通道）', en: 'Register as a developer on open.lazada.com (For Lazada Sellers)' },
        d: {
          zh: '访问 open.lazada.com，用您要同步的店铺卖家账号注册并登录，账户类型选“For Lazada Sellers”（自营卖家自用），不要选面向多卖家的 Service Providers（服务商）。个人、个体工商户、企业与工作室均可注册；本连接器面向您自己的店铺。',
          en: 'Visit open.lazada.com, sign in with the seller account you want to sync, and choose the “For Lazada Sellers” (in-house seller) channel—not Service Providers (which serve multiple sellers). Individuals, sole proprietors, companies and studios can register; this connector targets your own shop.',
        },
      },
      {
        h: { zh: '创建应用并选择类目，等待人工审核', en: 'Create an app, pick a category, and wait for manual review' },
        d: {
          zh: '进入 My Apps 创建应用，按提示填写应用名称、用途并选择应用类目（App Category）后提交。应用须经 Lazada 管理员人工审核通过才会发放 App Key 与 App Secret；审核周期以 open.lazada.com 当前规则为准（历史二手资料称约 2–4 周，勿作依据）。',
          en: 'Open My Apps, create an app, fill in its name and purpose, pick an App Category, then submit. The app must pass manual review by Lazada admins before an App Key and App Secret are issued; review timing follows open.lazada.com’s current rules (secondhand sources mention 2–4 weeks—do not rely on that).',
        },
      },
      {
        h: { zh: '在应用详情页记录 App Key / App Secret', en: 'Note the App Key / App Secret on the app details page' },
        d: {
          zh: '审核通过后在应用详情页记录 App Key（即授权页的 client_id），并点“View”查看 App Secret（可 Reset 重置，重置后须更新接入方配置）。在应用配置里启用店铺、商品、订单、库存的读取权限。',
          en: 'Once approved, note the App Key on the app details page (it is the authorize page client_id), and reveal the App Secret via “View” (it can be Reset; after a reset you must update the connector config). Enable read access for shop, products, orders and inventory in the app settings.',
        },
      },
      {
        h: { zh: '登记 Callback URL（本机 localhost 或 https 中转页面，redirect 须逐字一致）', en: 'Register the Callback URL (localhost or https placeholder; redirect must match exactly)' },
        d: {
          zh: '在应用配置页把 Callback URL 登记成一个您能在本机打开并从地址栏拷贝 code 的地址：推荐 http://127.0.0.1:<port>/callback（本机临时接收）；若 Console 不允许 http/回环，就登记一个您能控制的 https 中转页面。redirect_uri 必须与登记值逐字一致（scheme/host/port/path 都要对），否则授权页直接报“Redirect uri does not match the callback url of the APP”。',
          en: 'Register your Callback URL in the app settings as an address you can open locally and copy the code from: http://127.0.0.1:<port>/callback (local temporary receiver) is recommended; if the console disallows http/loopback, register an https placeholder page you control. redirect_uri must match the registered value character-for-character (scheme/host/port/path); otherwise the authorize page directly errors “Redirect uri does not match the callback url of the APP”.',
        },
      },
      {
        h: { zh: '在浏览器完成店铺授权，复制 code（约 30 分钟一次性）', en: 'Authorize the shop in a browser and copy the code (valid ~30 min, one-time)' },
        d: {
          zh: '用盈脉按 App Key 生成的授权链接（https://auth.lazada.com/oauth/authorize?response_type=code&client_id=AppKey&redirect_uri=登记的回调&state=随机串&force_auth=true）在浏览器打开，登录本店账号并同意授权。浏览器会 302 到您登记的回调地址，地址栏形如 https://回调地址/?code=xxxx&state=xxxx，把 code 整段复制回来。code 约 30 分钟内有效、只能用一次，拿到立刻换 token。',
          en: 'Open in a browser the authorization link YingMai builds from your App Key (https://auth.lazada.com/oauth/authorize?response_type=code&client_id=AppKey&redirect_uri=registered-callback&state=random&force_auth=true), sign in with your shop account and agree. The browser 302-redirects to your registered callback, whose address bar looks like https://callback/?code=xxxx&state=xxxx—copy the whole code back. The code is valid about 30 minutes and is single-use; exchange it immediately.',
        },
      },
      {
        h: { zh: '用 code 在本机换取 Access/Refresh Token', en: 'Exchange the code for access/refresh tokens on your machine' },
        d: {
          zh: '拿到 code 后尽快在本机向 https://auth.lazada.com/rest/auth/token/create 发一次 GET（app_key、app_secret、grant_type=authorization_code、code），返回 access_token、refresh_token、expires_in、refresh_expires_in 与 country。盈脉会按这些秒数倒计时，到期前自动用 refresh_token 换新；refresh_token 会滚动更新，盈脉加密保存新对，不写死多少天。',
          en: 'Within 30 minutes, GET https://auth.lazada.com/rest/auth/token/create from your machine (app_key, app_secret, grant_type=authorization_code, code). It returns access_token, refresh_token, expires_in, refresh_expires_in and country. YingMai counts down by these second values, refreshes automatically before expiry, and the rolling refresh_token is re-encrypted and stored; it does not hard-code days.',
        },
      },
      {
        h: { zh: '调 /shop/get 自检并填入盈脉测试', en: 'Self-check via /shop/get and test in YingMai' },
        d: {
          zh: '用 access_token 调 GET /shop/get 确认能取到店铺名与 seller_id。回到盈脉的 Lazada 连接窗口：国家选您的店铺所在国（sg/my/th/ph/id/vn，默认 sg），依次填入 App Key、App Secret、Access Token、Refresh Token，到期 epoch 可留空由盈脉自动维护，点击「测试连接」。',
          en: 'With the access token, call GET /shop/get to confirm you can read the shop name and seller_id. Back in YingMai’s Lazada dialog, pick your shop country (sg/my/th/ph/id/vn, sg by default), enter the App Key, App Secret, Access Token and Refresh Token (you may leave the expiry epochs blank—YingMai maintains them), then click “Test connection”.',
        },
      },
      {
        h: { zh: '保存并完成', en: 'Save and finish' },
        d: {
          zh: '测试通过后点击「保存并连接」，工作台会开始首次同步；随后可在「店铺商品」「订单管理」与库存中查看。',
          en: 'Once the test passes, click “Save & connect”; the first sync begins. View results under “Store products”, “Orders” and inventory.',
        },
      },
    ],
    notes: [
      {
        zh: 'refresh_token 滚动更新：每次刷新都会换发新的 Access/Refresh Token 对，盈脉在本机自动轮换并用加密保存新对；refresh_token 过期（按 refresh_expires_in 倒计时）后只能重新走一次上面的浏览器授权。',
        en: 'Rolling refresh_token: each refresh returns a brand-new access/refresh pair. YingMai rotates it locally and re-encrypts the new pair; once the refresh_token itself expires (counted down by refresh_expires_in), repeat the browser authorization above.',
      },
      {
        zh: '按国家分别授权打对应 host：业务 API host 按国家切分（sg=api.lazada.sg、my=api.lazada.com.my、th=api.lazada.co.th、ph=api.lazada.com.ph、id=api.lazada.co.id、vn=api.lazada.vn）；同一个 access_token 只属授权时的 country，多国店铺需分别授权、分别在盈脉建连接。',
        en: 'Authorize per country and hit the matching host: business API hosts are split by country (sg=api.lazada.sg, my=api.lazada.com.my, th=api.lazada.co.th, ph=api.lazada.com.ph, id=api.lazada.co.id, vn=api.lazada.vn). One access_token belongs only to the country it was authorized for; authorize and create a separate connection per country.',
      },
      {
        zh: '越南 host 是 api.lazada.vn（不是 api.lazada.com.vn，后者 DNS 无法解析）。',
        en: 'The Vietnam host is api.lazada.vn (not api.lazada.com.vn, which does not resolve in DNS).',
      },
      {
        zh: '错误口径：LazOP 错误统一为 HTTP 200 + JSON {type:ISV,code,message}，不能靠 HTTP 状态码或 429 判定；盈脉会解析 code 并在限流时退避。具体限流 QPS/配额与限流 code 名称未在公开文档正文取得，requestGapMs 取保守 1s，不写死未证实配额。',
        en: 'Error convention: LazOP errors always come back as HTTP 200 + JSON {type:ISV,code,message}; you cannot judge by HTTP status or 429. YingMai parses the code and backs off on rate limits. Exact QPS/quotas and rate-limit code names are not available in public doc text, so requestGapMs is set conservatively to 1s and unverified quotas are not hard-coded.',
      },
      {
        zh: '凭证安全：所有凭证经加密后仅保存在您的本机，不会上传；App Secret 仅在本机用于 HMAC-SHA256 签名，Access/Refresh Token 仅在内存与本机加密保存，不落明文磁盘。',
        en: 'Credential security: all credentials are encrypted and stored only on your computer and are never uploaded. The App Secret is used locally for HMAC-SHA256 signing; access/refresh tokens are held in memory and encrypted on disk, never written as plaintext.',
      },
      {
        zh: '主体差异：个人、个体工商户、企业与工作室均可走自营卖家自用通道注册；建应用须选类目并经 Lazada 管理员人工审核才发放 App Key/Secret，个人主体能否过审、是否要求营业执照以 open.lazada.com 注册与审核页为准。面向多卖家的 SaaS 才需要 Service Provider 资质，本连接器面向您自己的店铺。',
        en: 'Entity differences: individuals, sole proprietors, companies and studios can all use the in-house seller channel. Creating an app requires picking a category and passing Lazada admin review before an App Key/secret is issued; whether an individual entity passes, and whether a business license is required, follows open.lazada.com’s registration and review pages. Serving multiple sellers (SaaS) needs Service Provider status; this connector targets your own shop.',
      },
    ],
  },
  '1688': {
    updated: '2026-10-07',
    intro: {
      zh: '在盈脉里用关键词跨店搜索 1688（阿里巴巴中国站/内贸批发）的货源并查看商品详情，价格与起订量以人民币（CNY）展示。1688 的买家侧选品只读 API 面向跨境/代发采购商，需先完成企业实名并申请“代发/跨境选品解决方案”白名单；纯个人（仅身份证）无法自助开通。盈脉之后在本机用您自己的 App Key/Secret 与授权 Access Token 直连 AOP 网关，不需要公网服务器。',
      en: 'Search 1688 (Alibaba’s China domestic wholesale site) across shops by keyword and view product details inside YingMai, with prices and MOQs shown in CNY. 1688’s buyer-side sourcing read APIs target cross-border/dropshipping buyers and require enterprise real-name verification plus the dropshipping/cross-border selection solution whitelist; pure individuals (ID card only) cannot self-enable them. YingMai then connects locally to the AOP gateway with your own App Key/secret and authorized access token—no public server needed.',
    },
    scopes: [
      'product.search.keywordQuery',
      'product.search.queryProductDetail',
    ],
    steps: [
      {
        h: { zh: '准备 1688 账号并完成实名', en: 'Prepare a 1688 account and real-name verification' },
        d: {
          zh: '用企业支付宝注册并实名认证 1688 采购商账号。买家侧跨店选品 API 要求企业实名认证，纯个人（仅身份证、无营业执照）通常无法开通这类接口；个体工商户能否按“企业”过审需在入驻时与 1688 确认。',
          en: 'Register and real-name verify a 1688 buyer account with a corporate Alipay. Buyer-side cross-store sourcing APIs require enterprise real-name verification; pure individuals (ID card only, no business license) usually cannot enable them. Whether sole proprietorships pass as “enterprise” must be confirmed with 1688 during onboarding.',
        },
      },
      {
        h: { zh: '注册开发者并创建自用型应用', en: 'Register as a developer and create an in-house app' },
        d: {
          zh: '访问 aop.alibaba.com / open.1688.com 登录并进入开发者后台，按提示完成开发者资料，应用类型选“自用型”（企业内部采购/选品系统），不要选面向多卖家的他用型/ISV。创建后在应用概览记录 App Key 与 App Secret。',
          en: 'Sign in at aop.alibaba.com / open.1688.com, open the developer console, complete the developer profile, and create an “in-house” app (internal sourcing/procurement system) rather than a multi-seller ISV app. Copy the App Key and App Secret from the app overview.',
        },
      },
      {
        h: { zh: '完成企业实名并登记出口 IP 白名单', en: 'Finish enterprise verification and whitelist your outbound IP' },
        d: {
          zh: '在开发者后台完成企业实名认证，并在应用配置里登记本机的出口公网 IP（自用型应用需声明可发请求的服务器 IP）。家庭/办公宽带多为动态 IP，重启路由后 IP 可能变化，遇 source_ip_undeclared 类报错需回控制台补报当前出口 IP。',
          en: 'Complete enterprise real-name verification in the developer console and whitelist your machine’s outbound public IP in the app settings (in-house apps must declare which egress IPs may call APIs). Home/office broadband is often dynamic—if you hit a source_ip_undeclared-style error, add your current outbound IP in the console.',
        },
      },
      {
        h: { zh: '申请“代发/跨境选品”解决方案白名单', en: 'Apply for the dropshipping/cross-border selection solution whitelist' },
        d: {
          zh: '跨店搜品与商详接口归属“跨境 ERP/代发解决方案”，需在解决方案页提交申请、经 1688 人工审核开通。审核看企业采购商资质，周期与结果以 1688 为准；这一步通过前接口会返回权限/白名单错误。聚石塔部署仅对对外售卖的 ISV 强制，自用型应用不强制。',
          en: 'Cross-store search and detail APIs belong to the “cross-border ERP / dropshipping solution”; apply for it on the solutions page and wait for 1688’s manual review, which checks your buyer qualifications. Until approved, the APIs return a permission/whitelist error. Jushita hosting is required only for external-facing ISVs, not for in-house apps.',
        },
      },
      {
        h: { zh: '完成 OAuth 授权取 Access Token（本机无公网）', en: 'Authorize via OAuth to get an access token (no public server)' },
        d: {
          zh: '在浏览器打开授权链接：https://auth.1688.com/oauth/authorize?client_id=您的AppKey&site=1688&redirect_uri=登记的回调地址&state=随机串 。登录采购商账号并同意授权后，平台会把授权码 code 带回回调地址。本机无公网服务器：loopback（127.0.0.1）回调是否被官方允许需在应用设置实测；若不允许，就把 redirect 配成您能控制的页面，手动从地址栏整段复制 code。拿到 code 后按官方“开发指南→授权”页换取 access_token（社区资料描述为 code→refresh_token→access_token 两步式，该两步端点未在官方正文逐字确认，请以控制台为准）。',
          en: 'Open the authorization URL in a browser: https://auth.1688.com/oauth/authorize?client_id=YOUR_APPKEY&site=1688&redirect_uri=YOUR_REGISTERED_REDIRECT&state=random. Sign in with your buyer account and agree; the platform returns an authorization code on the redirect URL. With no public server: whether a loopback (127.0.0.1) redirect is allowed must be tested in your app settings; if not, point redirect to a page you control and copy the whole code from the address bar. Exchange the code for an access token per the official “Development guide → Authorization” page (community docs describe a code→refresh_token→access_token two-step flow; those two-step endpoints are not confirmed in official text—follow the console).',
        },
      },
      {
        h: { zh: '填入盈脉并测试连接', en: 'Enter credentials in YingMai and test' },
        d: {
          zh: '在盈脉的 1688 连接窗口依次填写 App Key、App Secret、Access Token，Member ID 可空（仅用于展示店铺名），点击「测试连接」。测试会用只读的关键词搜品接口（搜“耳机”第 1 页）校验 App Key、AOP 签名与 Token 是否可用。',
          en: 'In YingMai’s 1688 dialog, enter the App Key, App Secret and Access Token (Member ID is optional, display only), then click “Test connection”. The test calls the read-only keyword search API (searching “earphones”, page 1) to verify the App Key, AOP signature and token.',
        },
      },
      {
        h: { zh: '保存后按关键词选品', en: 'Save and source by keyword' },
        d: {
          zh: '测试通过后点击「保存并连接」。注意：货源选品是关键词驱动、没有“我的全量商品”，定时同步不会自动拉取商品；请在选品/搜索框输入关键词主动搜品，再对感兴趣的 offer 查看商详与 SKU。',
          en: 'Once the test passes, click “Save & connect”. Note: sourcing is keyword-driven—there is no “my full catalog”, so scheduled sync pulls nothing. Search by keyword in the sourcing box, then open an offer to view its details and SKUs.',
        },
      },
    ],
    notes: [
      {
        zh: '纯个人无法自助：买家侧跨店选品/商详接口需企业实名认证 + 解决方案白名单；个体工商户能否按“企业”过审无官方书面承诺，社区反馈偏谨慎，需实际提交申请才知道。面向多卖家的 SaaS 才需 ISV 服务商资质，本连接器面向您自己的采购选品。',
        en: 'Pure individuals cannot self-connect: buyer-side sourcing/detail APIs require enterprise real-name verification plus the solution whitelist. There is no written guarantee that sole proprietorships pass as “enterprise”, and community feedback is cautious—only an actual application tells. Serving multiple sellers (SaaS) needs ISV provider status; this connector targets your own sourcing.',
      },
      {
        zh: '聚石塔仅对对外售卖的 ISV 强制；自用型应用不强制聚石塔，但需登记出口 IP 白名单。',
        en: 'Jushita is mandatory only for external-facing ISVs; in-house apps do not require it, but their outbound IP must be whitelisted.',
      },
      {
        zh: '阶梯批发价与实时库存：1688 商品模型支持最小起订量与阶梯价，但买家侧 queryProductDetail 是否透出完整阶梯价/实时库存需以真实报文实测为准；透出则映射，未透出则对应字段留空，不臆造。',
        en: 'Tiered wholesale prices and live stock: 1688’s product model supports MOQ and tiered pricing, but whether the buyer-side queryProductDetail returns full tiered prices/live stock must be verified against real responses. If present they are mapped; if not, those fields are left blank rather than invented.',
      },
      {
        zh: 'OAuth 两步换 token（code→refresh_token→access_token）的精确端点与有效期未在官方文档站正文逐字确认（文档站为前端渲染）；access_token 失效/过期后请重新走一次上面的浏览器授权。',
        en: 'The exact endpoints and lifetimes of the two-step token exchange (code→refresh_token→access_token) are not confirmed word-for-word in official doc text (the doc site is client-rendered). If the access token expires or is rejected, repeat the browser authorization above.',
      },
      {
        zh: '币种：1688 为中国大陆内贸站，商品标价与交易均为人民币（CNY），跨境选品接口的多语言字段仅做翻译，价格仍为 CNY，由您自行换算。',
        en: 'Currency: 1688 is the China domestic wholesale site; prices and transactions are in CNY. The cross-border selection APIs only translate labels across languages—prices stay in CNY and you convert them yourself.',
      },
      {
        zh: '所有凭证经加密后仅保存在您的本机，不会上传；App Secret 仅在本机用于 AOP 签名，Access Token 仅在内存与本机加密保存。桌面端无法真正保密内置 Secret，请勿在不可信环境分发打包件。',
        en: 'All credentials are encrypted and stored only on your computer and are never uploaded. The App Secret is used locally for AOP signing; the access token is held in memory and encrypted on disk. A desktop build cannot truly hide an embedded secret, so do not distribute the packaged app in untrusted environments.',
      },
    ],
  },
  taobao: {
    updated: '2026-10-07',
    intro: {
      zh: '把您自己的淘宝/天猫店铺商品、订单与库存同步到盈脉。需要先以企业主体在淘宝开放平台创建“商家后台系统”自研应用并通过审核、入驻聚石塔；拿到 AppKey/AppSecret 后完成店铺授权。请注意：订单/收件人等敏感接口官方要求在聚石塔云内调用，盈脉是本机直连桌面工具，即使企业主体获批也无法从本机打通这些接口，本连接器按官方文档预先实现，不承诺能连上。',
      en: 'Sync products, orders and inventory from your own Taobao/Tmall shop into YingMai. First create a merchant in-house backend app as an enterprise on the Taobao Open Platform, pass review, onboard to Jushita, then obtain the AppKey/AppSecret and authorize your shop. Note: order/recipient sensitive APIs must run inside Jushita cloud; YingMai is a local-direct desktop tool, so even an approved enterprise cannot call them from this machine. This connector is pre-built per official docs and does not promise a working connection.',
    },
    scopes: [
      'taobao.items.onsale.get / items.inventory.get',
      'taobao.trades.sold.get / trade.fullinfo.get',
    ],
    steps: [
      {
        h: { zh: '确认主体与店铺资质', en: 'Check entity and shop eligibility' },
        d: {
          zh: '自研商家后台系统仅对企业主体（企业支付宝）+ 天猫卖家开放；淘宝集市 C 店卖家被官方明确排除。个人（仅身份证）无法自助；个体工商户能否按“公司身份”过审需在入驻时与小二确认，官方未单列通道。一个公司只能创建 1 个商家后台系统应用。',
          en: 'The merchant in-house backend is open only to enterprise entities (corporate Alipay) and Tmall sellers; Taobao C2C shops are explicitly excluded. Individuals (ID card only) cannot self-connect; whether sole proprietorships qualify as a “company” must be confirmed during onboarding. One company may create only one merchant backend app.',
        },
      },
      {
        h: { zh: '注册开发者并提交资质', en: 'Register as a developer and submit materials' },
        d: {
          zh: '在 open.taobao.com 用企业淘宝账号登录、绑定企业支付宝，进入伙伴工作台创建“商家系统自研接入 → 一站式电商后台 → 天猫商家自研 → 商家后台系统”应用。按要求提交产品说明书、OMS/ERP 类国家软件著作权与源代码片段，审核约 3–5 个工作日。未上线应用限 5000 次/日、三个月未上线会被删除。',
          en: 'Sign in at open.taobao.com with your enterprise Taobao account, bind a corporate Alipay, and create a “Merchant system in-house → one-stop backend → Tmall merchant in-house → merchant backend” app. Submit the product brief, an OMS/ERP software copyright and source snippets; review takes about 3–5 business days. Unlaunched apps are limited to 5000 calls/day and are removed after 3 months idle.',
        },
      },
      {
        h: { zh: '入驻聚石塔（关键限制）', en: 'Onboard to Jushita (key restriction)' },
        d: {
          zh: '订单/收件人等敏感接口必须在聚石塔 ECS 内调用，敏感数据不允许拿出聚石塔。盈脉是本机直连 Electron 桌面应用，没有聚石塔云服务器，因此即使您拿到 AppKey/AppSecret 与 Access Token，从本机发起的敏感订单调用仍会被聚石塔网络策略拦截。若日后需要真实打通，需在聚石塔内另跑一个中转服务，本机只调中转。',
          en: 'Order/recipient sensitive APIs must be called inside Jushita ECS, and sensitive data must not leave Jushita. YingMai is a local-direct Electron desktop app with no Jushita cloud server, so even with valid AppKey/AppSecret and access token, sensitive order calls from this machine are blocked by Jushita network policy. To truly connect later, run a relay inside Jushita and have the desktop call only that relay.',
        },
      },
      {
        h: { zh: 'OAuth 授权取 Access Token', en: 'Authorize via OAuth to get an access token' },
        d: {
          zh: '在浏览器打开授权链接（盈脉按您的 AppKey 生成）：https://oauth.taobao.com/authorize?response_type=code&client_id=您的AppKey&redirect_uri=登记的回调&state=随机串&view=web 。登录本店账号并同意授权后，平台在回调地址带回 code（约 30 分钟、一次性）。本机无公网：回环（127.0.0.1）回调是否被官方允许需在应用设置实测；若不允许，就把 redirect 配成您能控制的页面，手动从地址栏整段复制 code，再用 AppKey/AppSecret 向 https://oauth.taobao.com/token 换 access_token（即 session）。自研型商家后台不支持 refresh，授权一次约 1 年，到期只能重新授权。',
          en: 'Open the authorization link in a browser (YingMai builds it from your AppKey): https://oauth.taobao.com/authorize?response_type=code&client_id=YOUR_APPKEY&redirect_uri=REGISTERED_CALLBACK&state=random&view=web. Sign in with your shop account and agree; the platform returns a code on the redirect URL (valid ~30 min, single-use). With no public server, whether a 127.0.0.1 loopback redirect is allowed must be tested in app settings; if not, point redirect to a page you control and copy the whole code from the address bar, then POST it with AppKey/AppSecret to https://oauth.taobao.com/token for the access_token (the session). In-house merchant backends do not support refresh; the grant lasts about 1 year and must be re-authorized.',
        },
      },
      {
        h: { zh: '填入盈脉并测试连接', en: 'Enter credentials in YingMai and test' },
        d: {
          zh: '在盈脉的淘宝/天猫连接窗口依次填写卖家昵称（可空）、App Key、App Secret、Access Token，点击「测试连接」。测试会用只读的出售中商品列表接口（第 1 页 1 条）校验 AppKey、MD5 签名与 token。注意：若您的 AppKey 被聚石塔网络策略限制，测试或同步会返回可读的拦截/错误信息，这属于预期的云外限制，不是凭证填错。',
          en: 'In YingMai’s Taobao/Tmall dialog, enter the seller nickname (optional), App Key, App Secret and Access Token, then click “Test connection”. The test calls the read-only on-sale product list (page 1, 1 item) to verify the AppKey, MD5 signature and token. Note: if your AppKey is restricted by Jushita network policy, the test or sync returns a readable block/error—this is the expected out-of-cloud restriction, not a wrong credential.',
        },
      },
      {
        h: { zh: '保存与替代方案', en: 'Save and alternatives' },
        d: {
          zh: '若测试通过，点击「保存并连接」开始同步。若因聚石塔限制无法从本机打通，可继续用手工录入与文件导入维护商品与订单；待日后在聚石塔内部署中转服务后再升级为本机直连。',
          en: 'If the test passes, click “Save & connect” to start sync. If Jushita policy blocks the local connection, keep maintaining products and orders via manual entry and file import; later, deploy a relay inside Jushita and upgrade to local-direct sync.',
        },
      },
    ],
    notes: [
      {
        zh: '本连接器定档 restricted：订单/收件人敏感 API 必须在聚石塔 ECS 内发起，盈脉是本机直连，即使企业主体获批也无法从本机打通；适配器仅按官方文档预实现签名/OAuth/端点，不承诺能连上。',
        en: 'This connector is restricted: order/recipient sensitive APIs must run inside Jushita ECS, and YingMai connects locally, so even an approved enterprise cannot reach them from this machine. The adapter only pre-implements signing/OAuth/endpoints per official docs and does not promise a working connection.',
      },
      {
        zh: '主体差异：个人（仅身份证）无法自助接入；个体工商户能否按“公司身份”过审无官方书面承诺，需实际提交；企业与工作室可走天猫企业卖家自研通道，但仍受聚石塔部署限制。对接多个卖家店铺（SaaS）还需服务商资质，本连接器面向您自己的店铺。',
        en: 'Entity differences: individuals (ID card only) cannot self-connect; there is no written guarantee that sole proprietorships pass as a “company”, so only an actual application tells. Companies and studios may use the Tmall enterprise seller in-house path, still subject to Jushita hosting. Serving multiple sellers (SaaS) also needs provider status; this connector targets your own shop.',
      },
      {
        zh: '收件人 PII 在聚石塔外为密文/脱敏，本机拿不到明文；买家姓名/电话/地址字段留空，不中断同步。订单最多回溯约三个月。',
        en: 'Recipient PII is masked/ciphertext outside Jushita and cannot be read from this machine; buyer name/phone/address fields are left blank without breaking sync. Orders reach back about three months at most.',
      },
      {
        zh: '自研型商家后台不支持 refresh_token：授权一次约 1 年，到期只能重新走一次上面的浏览器授权。签名 timestamp 用 GMT+8（yyyy-MM-dd HH:mm:ss），订单/商品金额均为人民币（CNY）。',
        en: 'In-house merchant backends do not support refresh_token: the grant lasts about 1 year and must be re-authorized via the browser flow above. The signature timestamp uses GMT+8 (yyyy-MM-dd HH:mm:ss); product and order amounts are in CNY.',
      },
      {
        zh: '所有凭证经加密后仅保存在您的本机，不会上传；App Secret 仅在本机用于 MD5 签名，Access Token（约 1 年）仅在内存与本机加密保存，过期后重新授权即可。',
        en: 'All credentials are encrypted and stored only on your computer and are never uploaded. The App Secret is used locally for MD5 signing; the access token (about 1 year) is held in memory and encrypted on disk. Re-authorize when it expires.',
      },
    ],
  },
  jd: {
    updated: '2026-10-07',
    intro: {
      zh: '把您自己的京东店铺商品、订单与库存同步到盈脉。需要先在京东商家开放平台/宙斯注册开发者、创建商家自研应用并通过审核、再入驻京东云鼎；拿到 AppKey/AppSecret 后完成店铺授权。请注意：敏感订单接口必须在云鼎内发起，云鼎外调用会被拦截；盈脉是本机直连桌面工具，即使企业店铺获批也无法从本机打通，本连接器按官方文档预先实现，不承诺能连上。',
      en: 'Sync products, orders and inventory from your own JD shop into YingMai. First register as a developer on the JD open platform/Zeus, create an in-house app and pass review, then onboard to JD Yunding; obtain the AppKey/AppSecret and authorize your shop. Note: sensitive order APIs must run inside Yunding and calls outside are blocked; YingMai is a local-direct desktop tool, so even an approved shop cannot call them from this machine. This connector is pre-built per official docs and does not promise a working connection.',
    },
    scopes: [
      'jingdong.item.list.get / item.read.get',
      'Order read APIs (apply via permission groups in the console; exact method names to be confirmed after login)',
    ],
    steps: [
      {
        h: { zh: '确认主体与店铺资质', en: 'Check entity and shop eligibility' },
        d: {
          zh: '京东店铺分个人店、个体店、普通企业店、品牌店；但“能开店”不等于“能自助申请宙斯订单 API”。商家自研应用需企业 POP 店铺主账号审核（约 1–3 个工作日）；个人店/个体店主体能否通过自研应用审核，官方公开文档未承诺，需提交后以审核为准。',
          en: 'JD shops range from individual to enterprise/brand stores, but “having a shop” is not the same as “being able to self-apply for Zeus order APIs”. In-house apps require an enterprise POP shop main-account review (about 1–3 business days); whether individual/sole-proprietor shops pass is not promised in public docs and depends on review.',
        },
      },
      {
        h: { zh: '注册开发者并创建自研应用', en: 'Register as a developer and create an in-house app' },
        d: {
          zh: '在 open.jd.com / jos.jd.com 注册开发者，创建商家自研应用，选择商品/订单读取权限。应用本身在商家开放平台审核，约 1–3 个工作日。审核通过后在应用概览记录 AppKey 与 AppSecret。',
          en: 'Register as a developer at open.jd.com / jos.jd.com, create a merchant in-house app, and select read permissions for products/orders. The app is reviewed on the merchant open platform in about 1–3 business days. After approval, copy the AppKey and AppSecret from the app overview.',
        },
      },
      {
        h: { zh: '入驻京东云鼎（关键限制）', en: 'Onboard to JD Yunding (key restriction)' },
        d: {
          zh: '敏感 API 必须在云鼎内发起，敏感数据必须在云鼎内完成调用；云鼎外调用会报“该 api 是敏感 api，请将您的 app 入驻云鼎平台方可调用”。用开通自研应用的店铺主账号激活云鼎、选“零售”身份提交，审核约 1–2 个工作日。盈脉是本机直连 Electron 桌面应用，没有云鼎服务器，因此即使您拿到 AppKey/AppSecret 与 Access Token，从本机发起的敏感订单调用仍会被拦截。',
          en: 'Sensitive APIs must be called inside Yunding, and sensitive data must be processed inside Yunding; outside calls return “this API is sensitive—please onboard your app to Yunding”. Activate Yunding with the shop main account that opened the in-house app, choose the “retail” identity; review takes about 1–2 business days. YingMai is a local-direct Electron desktop app with no Yunding server, so even with valid credentials, sensitive order calls from this machine are blocked.',
        },
      },
      {
        h: { zh: 'OAuth 授权取 Access Token', en: 'Authorize via OAuth to get an access token' },
        d: {
          zh: '在浏览器打开授权链接（盈脉按您的 AppKey 生成）：https://oauth.jd.com/oauth/authorize?response_type=code&client_id=您的AppKey&redirect_uri=登记的回调&state=随机串 。登录本店账号并同意授权后，平台在回调地址带回 code。本机无公网：回环（127.0.0.1）回调是否被官方允许需实测；若不允许，就把 redirect 配成您能控制的页面，手动从地址栏整段复制 code，再用 AppKey/AppSecret 向 https://oauth.jd.com/oauth/token 换 access_token。参考有效期约 24 小时、refresh_token 约 7 天（iopv2 工业采购域数值，POP 商家域以授权返回 expires_in 为准）。',
          en: 'Open the authorization link in a browser (YingMai builds it from your AppKey): https://oauth.jd.com/oauth/authorize?response_type=code&client_id=YOUR_APPKEY&redirect_uri=REGISTERED_CALLBACK&state=random. Sign in with your shop account and agree; the platform returns a code on the redirect URL. With no public server, whether a 127.0.0.1 loopback redirect is allowed must be tested; if not, point redirect to a page you control and copy the whole code from the address bar, then POST it with AppKey/AppSecret to https://oauth.jd.com/oauth/token for the access_token. Reference lifetime is ~24h access / ~7d refresh (iopv2 industrial-purchase figures; follow the POP domain’s returned expires_in).',
        },
      },
      {
        h: { zh: '填入盈脉并测试连接', en: 'Enter credentials in YingMai and test' },
        d: {
          zh: '在盈脉的京东连接窗口依次填写卖家账号 PIN（可空）、App Key、App Secret、Access Token、Refresh Token（可空），点击「测试连接」。测试会用只读的商品列表接口（第 1 页 1 条）校验 AppKey、MD5 签名与 token。若因云鼎策略限制，测试或同步会返回可读的拦截/错误信息，这属于预期的云外限制。',
          en: 'In YingMai’s JD dialog, enter the seller PIN (optional), App Key, App Secret, Access Token and Refresh Token (optional), then click “Test connection”. The test calls the read-only product list (page 1, 1 item) to verify the AppKey, MD5 signature and token. If Yunding policy blocks it, the test or sync returns a readable block/error—this is the expected out-of-cloud restriction.',
        },
      },
      {
        h: { zh: '保存与替代方案', en: 'Save and alternatives' },
        d: {
          zh: '若测试通过，点击「保存并连接」开始同步。若因云鼎限制无法从本机打通，可继续用手工录入与文件导入维护；待日后在云鼎内部署中转服务后再升级为本机直连。',
          en: 'If the test passes, click “Save & connect” to start sync. If Yunding policy blocks the local connection, keep maintaining via manual entry and file import; later deploy a relay inside Yunding and upgrade to local-direct sync.',
        },
      },
    ],
    notes: [
      {
        zh: '本连接器定档 restricted：敏感订单接口必须在京东云鼎内发起，盈脉是本机直连，即使企业 POP 店铺获批也无法从本机打通；适配器仅按官方文档预实现 OAuth/签名/端点，不承诺能连上。',
        en: 'This connector is restricted: sensitive order APIs must run inside JD Yunding, and YingMai connects locally, so even an approved enterprise POP shop cannot reach them from this machine. The adapter only pre-implements OAuth/signing/endpoints per official docs and does not promise a working connection.',
      },
      {
        zh: 'POP 商家宙斯域的 OAuth 端点、timestamp 格式、错误结构与限流数值本次未抓到登录态官方正文；下列实现按社区/SDK 一致引用与 iopv2 协议参考，接入前必须用真实 app_key 登录控制台复核。',
        en: 'The POP merchant Zeus-domain OAuth endpoints, timestamp format, error structure and rate limits were not available in logged-in official text. The implementation follows community/SDK consensus and iopv2 protocol reference; verify against the console with a real app_key before relying on it.',
      },
      {
        zh: '主体差异：个人、个体工商户、企业与工作室均可注册开发者；但自研应用+云鼎路径对个人店/个体店能否过审无官方承诺。对接多个卖家店铺（SaaS）还需 ISV 服务商资质，本连接器面向您自己的店铺。',
        en: 'Entity differences: individuals, sole proprietors, companies and studios can all register as developers, but there is no official promise that individual/sole-proprietor shops pass the in-house app + Yunding path. Serving multiple sellers (SaaS) also needs ISV status; this connector targets your own shop.',
      },
      {
        zh: '收件人姓名/手机为加密 pin / 脱敏，云鼎外拿不到明文；这些 PII 字段留空，不中断同步。商品与订单金额均为人民币（CNY）。',
        en: 'Recipient name/phone are encrypted pins/masked and cannot be read outside Yunding; these PII fields are left blank without breaking sync. Product and order amounts are in CNY.',
      },
      {
        zh: '所有凭证经加密后仅保存在您的本机，不会上传；App Secret 仅在本机用于 MD5 签名，Access/Refresh Token 仅在内存与本机加密保存，不落明文磁盘。',
        en: 'All credentials are encrypted and stored only on your computer and are never uploaded. The App Secret is used locally for MD5 signing; access/refresh tokens are held in memory and encrypted on disk, never written as plaintext.',
      },
    ],
  },
  pdd: {
    updated: '2026-10-07',
    intro: {
      zh: '把您自己的拼多多店铺商品、订单与库存同步到盈脉。需要先在拼多多开放平台注册开发者、完成“商家自研”身份认证并创建应用、经招商小二确认店铺资质后上线部署入多多云；拿到 client_id/client_secret 后完成店铺授权。请注意：自研应用上线须部署入多多云，订单解密云外仅 1 次/10 秒测试配额；盈脉是本机直连桌面工具，生产环境无法从本机打通，本连接器按官方文档预先实现，不承诺能连上。',
      en: 'Sync products, orders and inventory from your own Pinduoduo shop into YingMai. First register on the Pinduoduo Open Platform, complete “merchant in-house” identity verification and create an app, get BD confirmation of your shop qualification, then go live by deploying into Duoduo Cloud; obtain client_id/client_secret and authorize your shop. Note: in-house apps must be deployed into Duoduo Cloud to go live, and order decryption outside the cloud is limited to 1 call/10s for testing. YingMai is a local-direct desktop tool and cannot run production calls from this machine. This connector is pre-built per official docs and does not promise a working connection.',
    },
    scopes: [
      'pdd.goods.list.get / goods.detail.get',
      'pdd.order.list.get / order.information.get (up to 90 days)',
    ],
    steps: [
      {
        h: { zh: '确认可认证角色与店铺资质', en: 'Check your role and shop qualification' },
        d: {
          zh: '开放平台有多种可认证角色。与本连接器相关的“拼多多商家（自研）”角色要求是拼多多店铺，且需经招商小二认证的品牌商/大商家；官方客服明确存在“店铺资质不满足商家自研入驻条件”的驳回路径。纯个人仅能注册“多多进宝推手（CPS 导购）”，不能读取自己店铺订单。个体工商户/普通中小商家能否过审，需联系招商小二或邮件 open@pinduoduo.com 确认。',
          en: 'The platform offers several roles. The “Pinduoduo merchant (in-house)” role relevant here requires a Pinduoduo shop certified by the BD team as a brand/large merchant; support explicitly lists a rejection path for shops that do not meet in-house onboarding conditions. Pure individuals can only register as “Duoduo Jinbao promoters” (CPS) and cannot read their own shop orders. Whether sole proprietors/small shops qualify must be confirmed with BD or by email to open@pinduoduo.com.',
        },
      },
      {
        h: { zh: '注册开发者并创建自研应用', en: 'Register as a developer and create an in-house app' },
        d: {
          zh: '在 open.pinduoduo.com 登录、注册开发者并完成身份认证，创建“商家后台系统”类自研应用（仅供您自己店铺使用，不可发布到服务市场）。审核通过后须在 30 天内提交上线，否则应用被驳回、无法调接口。在应用详情记录 client_id 与 client_secret。',
          en: 'Sign in at open.pinduoduo.com, register as a developer and complete identity verification, then create a “merchant backend system” in-house app (for your own shop only; it cannot be published to the service market). After approval you must submit it live within 30 days, or the app is rejected and cannot call APIs. Copy the client_id and client_secret from the app details.',
        },
      },
      {
        h: { zh: '上线须部署入多多云（关键限制）', en: 'Going live requires Duoduo Cloud deployment (key restriction)' },
        d: {
          zh: '商家自研系统上线流程含“部署入云”（多多云自助申请入口 open.pinduoduo.com/paas/self-apply）。订单解密接口云外仅 1 次/10 秒、单次≤100 条（约 33 单），云内无此限制。盈脉是本机直连 Electron 桌面应用，没有多多云服务器，生产环境无法从本机打通；本机仅可在测试期用极少量解密配额联调。',
          en: 'The merchant in-house go-live flow includes “deploy into the cloud” (Duoduo Cloud self-serve at open.pinduoduo.com/paas/self-apply). Order decryption outside the cloud is limited to 1 call/10s, up to 100 items per call (~33 orders); inside the cloud there is no such limit. YingMai is a local-direct Electron desktop app with no Duoduo Cloud server and cannot run production calls from this machine; locally you may only do minimal test-period debugging within the limited decryption quota.',
        },
      },
      {
        h: { zh: 'OAuth 授权取 Access Token', en: 'Authorize via OAuth to get an access token' },
        d: {
          zh: '在浏览器打开授权链接（盈脉按您的 client_id 生成）：https://open.pinduoduo.com/oauth/authorize?client_id=您的client_id&response_type=code&redirect_uri=登记的回调&state=随机串 。登录本店账号并同意授权后，平台在回调地址带回 code。本机无公网：回环（127.0.0.1）回调是否被官方允许需实测；若不允许，就把 redirect 配成您能控制的页面，手动从地址栏整段复制 code，再用 client_id/client_secret 向令牌端点换 access_token。授权说明页正文为 JS 渲染，authorize/token 端点 URL 以控制台为准。',
          en: 'Open the authorization link in a browser (YingMai builds it from your client_id): https://open.pinduoduo.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=REGISTERED_CALLBACK&state=random. Sign in with your shop account and agree; the platform returns a code on the redirect URL. With no public server, whether a 127.0.0.1 loopback redirect is allowed must be tested; if not, point redirect to a page you control and copy the whole code from the address bar, then exchange it with client_id/client_secret at the token endpoint. The authorization doc page is JS-rendered; follow the console for the exact authorize/token URLs.',
        },
      },
      {
        h: { zh: '填入盈脉并测试连接', en: 'Enter credentials in YingMai and test' },
        d: {
          zh: '在盈脉的拼多多连接窗口依次填写店铺名（可空）、Client ID（AppKey）、Client Secret、Access Token，点击「测试连接」。测试会用只读的商品列表接口（第 1 页 1 条）校验 client_id、MD5 签名与 token。若因多多云/解密配额限制，测试或同步会返回可读的拦截/错误信息，这属于预期的云外限制。',
          en: 'In YingMai’s Pinduoduo dialog, enter the shop name (optional), Client ID (AppKey), Client Secret and Access Token, then click “Test connection”. The test calls the read-only product list (page 1, 1 item) to verify the client_id, MD5 signature and token. If Duoduo Cloud/decryption quota policy blocks it, the test or sync returns a readable block/error—this is the expected out-of-cloud restriction.',
        },
      },
      {
        h: { zh: '保存与替代方案', en: 'Save and alternatives' },
        d: {
          zh: '若测试通过，点击「保存并连接」开始同步。若因多多云限制无法从本机打通，可继续用手工录入与文件导入维护；待日后部署入多多云后再升级为本机直连。',
          en: 'If the test passes, click “Save & connect” to start sync. If Duoduo Cloud policy blocks the local connection, keep maintaining via manual entry and file import; later, deploy into Duoduo Cloud and upgrade to local-direct sync.',
        },
      },
    ],
    notes: [
      {
        zh: '本连接器定档 restricted：自研应用上线须部署入多多云、订单解密云外仅 1 次/10 秒；盈脉是本机直连，生产环境无法从本机打通。适配器仅按官方文档预实现 gw-api 网关/签名/pdd.* 接口，不承诺能连上。',
        en: 'This connector is restricted: in-house apps must be deployed into Duoduo Cloud to go live, and order decryption outside the cloud is limited to 1 call/10s. YingMai connects locally and cannot run production calls from this machine. The adapter only pre-implements the gw-api gateway/signing/pdd.* APIs per official docs and does not promise a working connection.',
      },
      {
        zh: '主体差异：纯个人仅能做 CPS 导购、不能读本店订单；个体工商户/普通中小商家能否开通商家自研无官方书面承诺，需招商小二确认。对接多个卖家店铺（SaaS）才需软件服务商（企业）资质，本连接器面向您自己的店铺。',
        en: 'Entity differences: pure individuals can only do CPS promotion and cannot read their own shop orders; there is no written guarantee that sole proprietors/small shops can enable in-house merchant access—confirm with BD. Serving multiple sellers (SaaS) needs the software-provider (enterprise) role; this connector targets your own shop.',
      },
      {
        zh: '收件人姓名/手机/地址默认密文，需 pdd.open.decrypt.batch 解密；云外解密限流 1 次/10 秒、单次≤100 条。本机不做批量解密，这些 PII 字段留空，不中断同步。订单最多回溯 90 天。',
        en: 'Recipient name/phone/address are ciphertext by default and require pdd.open.decrypt.batch; out-of-cloud decryption is limited to 1 call/10s, ≤100 items per call. The desktop does not batch-decrypt, so these PII fields are left blank without breaking sync. Orders reach back at most 90 days.',
      },
      {
        zh: '价格口径：商品/订单价格接口返回单位为“分”，盈脉换算为“元”展示；币种为人民币（CNY）。订单增量建议倒序分页防漏单；应用审核通过后 30 天内必须上线。',
        en: 'Pricing: product/order prices are returned in “cents”; YingMai converts them to yuan for display, in CNY. For incremental orders, page in reverse order to avoid missing orders; after approval the app must go live within 30 days.',
      },
      {
        zh: '所有凭证经加密后仅保存在您的本机，不会上传；Client Secret 仅在本机用于 MD5 签名，Access Token 仅在内存与本机加密保存，不落明文磁盘。',
        en: 'All credentials are encrypted and stored only on your computer and are never uploaded. The Client Secret is used locally for MD5 signing; the access token is held in memory and encrypted on disk, never written as plaintext.',
      },
    ],
  },
  douyin: {
    updated: '2026-10-07',
    intro: {
      zh: '把您自己的抖音电商（抖店）店铺商品、订单与库存同步到盈脉。需要先以企业主体在抖店开放平台完成企业认证、创建商家后台系统自研应用（或经服务商授权），取得 App Key/Secret 与 access_token。请注意：第三方工具型应用个人和个体户无法入驻，自研自用还需电商类软著且主体一致；接口有 IP 白名单，盈脉是本机直连桌面工具，出口动态 IP 需在控制台配置。本连接器按官方文档预先实现，不承诺能连上。',
      en: 'Sync products, orders and inventory from your own Douyin (Douyin Shop) store into YingMai. First complete enterprise verification as a company on the Douyin Shop open platform, create a merchant in-house backend app (or authorize via a provider), and obtain the App Key/Secret and access_token. Note: third-party tool apps are closed to individuals and sole proprietors, and in-house apps additionally need an e-commerce software copyright with matching entity. APIs are IP-whitelisted; YingMai is a local-direct desktop tool, so its dynamic outbound IP must be whitelisted in the console. This connector is pre-built per official docs and does not promise a working connection.',
    },
    scopes: [
      'order.searchList / order.orderDetail (up to about 90 days)',
      'sku.list / product.getGoodsCategory',
    ],
    steps: [
      {
        h: { zh: '确认主体与店铺资质', en: 'Check entity and shop eligibility' },
        d: {
          zh: '第三方工具型应用仅支持企业入驻，个人和个体工商户资质无法入驻；自研自用（商家后台系统）需企业营业执照、电商类国家软件著作权，且软著主体/开发者账号主体/授权店铺主体三者一致（或相同法人/母子公司/控股，需企查查证明）。抖店开店本身支持个人/个体/企业三种主体，但开店不等于能注册开放平台开发者。',
          en: 'Third-party tool apps are enterprise-only; individuals and sole proprietorships cannot onboard. In-house merchant backend apps require a business license, an e-commerce software copyright, and three-way entity consistency (copyright holder, developer account, authorized shop; or same legal parent/subsidiary with registry proof). Opening a Douyin Shop itself supports individual/sole-proprietor/enterprise sellers, but opening a shop is not the same as becoming an open-platform developer.',
        },
      },
      {
        h: { zh: '注册开发者并提交资质', en: 'Register as a developer and submit materials' },
        d: {
          zh: '在 op.jinritemai.com 用手机号注册，完成企业认证（营业执照+法人信息，审核约 1–3 个工作日）。商家后台系统类目下只能创建 1 个应用，但可授权多个店铺；提交系统功能说明书、API 调用信息、系统架构、软著证书与自研发源代码片段。主体一致自动通过，不一致需关联证明，审核约 1–3 个工作日。',
          en: 'Sign up at op.jinritemai.com with a phone number and complete enterprise verification (business license + legal-rep info, reviewed in about 1–3 business days). The merchant-backend category allows only one app, but it can authorize multiple shops; submit the system brief, API call info, architecture, software copyright and your own source snippets. Matching entities are auto-approved; mismatched entities need relationship proof, reviewed in about 1–3 business days.',
        },
      },
      {
        h: { zh: '配置 IP 白名单（关键限制）', en: 'Configure the IP whitelist (key restriction)' },
        d: {
          zh: '接口报错 sub_code "isv.invalid_ip" 表示请求来源 IP 不可信。盈脉运行在您的本机，出口 IP 多为家庭宽带动态 IP，需要在开放平台控制台把本机出口公网 IP 加入白名单；动态 IP 变化时需补报，否则测试或同步会返回可读的拦截信息。本连接器不伪造连通，遇到白名单拦截会如实提示。',
          en: 'The sub_code "isv.invalid_ip" means the request source IP is not trusted. YingMai runs on your machine whose outbound IP is usually a dynamic home-broadband address; you must add this machine’s public outbound IP to the whitelist in the open-platform console and re-add it whenever it changes. This connector never fakes connectivity and reports the whitelist block readably.',
        },
      },
      {
        h: { zh: '获取 access_token', en: 'Obtain the access token' },
        d: {
          zh: '自用型应用通过 /token/create（grant_type=authorization_self，需 shop_id）取 access_token，约 7 天有效；过期前 1 小时调用 create 会返回新 token、旧 token 续效 1 小时，过期后调用返回全新 token、旧 token 立即失效。第三方服务商走标准 OAuth2 code 授权。本机无公网：回环（127.0.0.1）回调是否被官方允许需实测；若不允许，就把 redirect 配成您能控制的页面，手动从地址栏整段复制 code 再换 token。',
          en: 'In-house apps obtain an access_token via /token/create (grant_type=authorization_self, needs shop_id), valid about 7 days; calling create within 1h of expiry returns a new token while the old one stays valid 1h, and after expiry a brand-new pair invalidates the old one. Third-party providers use the standard OAuth2 code flow. With no public server, whether a 127.0.0.1 loopback redirect is allowed must be tested; if not, point redirect to a page you control and copy the whole code from the address bar to exchange it.',
        },
      },
      {
        h: { zh: '填入盈脉并测试连接', en: 'Enter credentials in YingMai and test' },
        d: {
          zh: '在盈脉的抖音电商连接窗口依次填写店铺 ID（shop_id）、App Key、App Secret、Access Token，点击「测试连接」。测试会用只读的订单列表接口（第 1 页 1 条）校验 AppKey、MD5/HMAC 签名与 token。若因企业认证/软著/IP 白名单不满足，测试会返回可读的拦截/错误信息，这属于预期的资质门槛，不是凭证填错。',
          en: 'In YingMai’s Douyin dialog, enter the Shop ID (shop_id), App Key, App Secret and Access Token, then click “Test connection”. The test calls the read-only order list (page 1, 1 item) to verify the AppKey, MD5/HMAC signature and token. If enterprise/copyright/IP-whitelist prerequisites are not met, the test returns a readable block/error—this is the expected eligibility gate, not a wrong credential.',
        },
      },
      {
        h: { zh: '保存与替代方案', en: 'Save and alternatives' },
        d: {
          zh: '若测试通过，点击「保存并连接」开始同步。若因资质或 IP 白名单限制无法从本机打通，可继续用手工录入与文件导入维护商品与订单。',
          en: 'If the test passes, click “Save & connect” to start sync. If qualification or IP-whitelist policy blocks the local connection, keep maintaining products and orders via manual entry and file import.',
        },
      },
    ],
    notes: [
      {
        zh: '本连接器定档 restricted：第三方工具型应用仅企业可入驻、个人/个体户无法注册，自研自用还需软著且主体一致，并存在 IP 白名单；适配器仅按官方文档预实现签名/授权/端点，不承诺能连上。',
        en: 'This connector is restricted: third-party tool apps are enterprise-only (individuals/sole proprietors cannot register), in-house apps need a software copyright with matching entity, and there is an IP whitelist. The adapter only pre-implements signing/authorization/endpoints per official docs and does not promise a working connection.',
      },
      {
        zh: '主体差异：个人（仅身份证）可开店但无法注册开放平台开发者；个体工商户在第三方工具型应用被明确排除，自研类目是否接受个体营业执照以审核为准；企业与工作室可走企业开发者/自研通道，仍受软著与 IP 白名单约束。对接多个卖家店铺（SaaS）还需服务商资质，本连接器面向您自己的店铺。',
        en: 'Entity differences: individuals (ID card only) can open a shop but cannot register as open-platform developers; sole proprietorships are explicitly excluded from third-party tool apps, and whether the in-house category accepts a sole-proprietor license depends on review. Companies and studios may use the enterprise developer/in-house path, still subject to the copyright and IP-whitelist rules. Serving multiple sellers (SaaS) also needs provider status; this connector targets your own shop.',
      },
      {
        zh: '收件人姓名/手机/地址等 PII 受平台数据权限与加密规则约束，未申请相应权限时拿不到明文；这些字段留空，不中断同步。订单最多回溯约 90 天。',
        en: 'Recipient name/phone/address PII is governed by platform data permissions and encryption; without the right scope, plaintext cannot be read. These fields are left blank without breaking sync. Orders reach back about 90 days at most.',
      },
      {
        zh: '签名 timestamp 用 GMT+8（yyyy-MM-dd HH:mm:ss）；MD5 为默认、HMAC-SHA256 为推荐（后续下线 MD5）。商品与订单金额均为人民币（CNY）。',
        en: 'The signature timestamp uses GMT+8 (yyyy-MM-dd HH:mm:ss); MD5 is the default and HMAC-SHA256 is recommended (MD5 will be retired). Product and order amounts are in CNY.',
      },
      {
        zh: '所有凭证经加密后仅保存在您的本机，不会上传；App Secret 仅在本机用于签名，Access Token 仅在内存与本机加密保存，过期后按上面的流程重新获取即可。',
        en: 'All credentials are encrypted and stored only on your computer and are never uploaded. The App Secret is used locally for signing; the access token is held in memory and encrypted on disk. Re-obtain it via the flow above when it expires.',
      },
    ],
  },
  kuaishou: {
    updated: '2026-10-07',
    intro: {
      zh: '把您自己的快手小店商品、订单与库存同步到盈脉。需要先在快手电商开放平台（open.kwaixiaodian.com，区别于通用小程序开放平台 open.kuaishou.com）以企业主体入驻为商家开发者，创建应用并通过审核，再完成店铺 OAuth 授权拿到 access_token。请注意：入驻须企业营业执照且经营范围含电商销售与技术开发，个人不可注册；本连接器按官方文档预先实现，不承诺能连上。',
      en: 'Sync products, orders and inventory from your own Kuaishou store into YingMai. First onboard as a merchant developer as a company on the Kuaishou E-commerce open platform (open.kwaixiaodian.com, distinct from the general mini-program platform open.kuaishou.com), create and get an app approved, then complete shop OAuth to obtain an access_token. Note: onboarding requires a business license whose scope covers e-commerce sales and technical development; individuals cannot register. This connector is pre-built per official docs and does not promise a working connection.',
    },
    scopes: [
      'merchant_item',
      'merchant_order',
      'merchant_refund / merchant_logistics',
    ],
    steps: [
      {
        h: { zh: '确认主体与开发者角色', en: 'Check entity and developer role' },
        d: {
          zh: '商家开发者角色对接自有快手小店，要求企业营业执照且经营范围具备“电商产品销售和技术开发”相关资质。个人（无营业执照）不可注册；个体工商户营业执照是否被认定为“企业”需以平台实际审核为准。选择角色后不可更改。',
          en: 'The merchant-developer role connects your own Kuaishou store and requires a business license whose scope covers e-commerce sales and technical development. Individuals (no license) cannot register; whether a sole-proprietorship license counts as “enterprise” depends on actual review. The role cannot be changed after you pick it.',
        },
      },
      {
        h: { zh: '入驻并创建应用', en: 'Onboard and create an app' },
        d: {
          zh: '在 open.kwaixiaodian.com 扫码登录、勾选入驻协议、选择商家开发者角色，填写法人信息/企业信息/管理员实名信息并上传企业营业执照，提交审核（约 1–3 个工作日邮件通知）。通过后创建应用，填写名称、说明、回调地址、官网与 MRD/PRD；应用审核约 1–3 个工作日，之后系统安全扫描约 4–6 小时。记录分配的 appkey、app_secret、signSecret。',
          en: 'Sign in at open.kwaixiaodian.com by QR code, accept the agreement, choose the merchant-developer role, fill in legal-rep/enterprise/admin real-name info, upload the business license, and submit for review (about 1–3 business days by email). Then create an app with name, description, redirect URI, site and MRD/PRD; app review takes about 1–3 business days, followed by a 4–6 hour security scan. Copy the assigned appkey, app_secret and signSecret.',
        },
      },
      {
        h: { zh: 'OAuth 授权取 Access Token', en: 'Authorize via OAuth to get an access token' },
        d: {
          zh: '在浏览器打开授权页：https://open.kwaixiaodian.com/oauth/authorize?app_id=您的appkey&redirect_uri=登记的回调&scope=merchant_item,merchant_order&response_type=code&state=随机串 。登录本店账号并同意后，平台在回调地址带回 code（约 2 分钟、一次性）。本机无公网：回环（127.0.0.1）回调是否被官方允许需实测；若不允许，就把 redirect 配成您能控制的页面，手动从地址栏整段复制 code，再用 app_id/app_secret 向 https://openapi.kwaixiaodian.com/oauth2/access_token 换 access_token。',
          en: 'Open the authorization page in a browser: https://open.kwaixiaodian.com/oauth/authorize?app_id=YOUR_APPKEY&redirect_uri=REGISTERED_CALLBACK&scope=merchant_item,merchant_order&response_type=code&state=random. Sign in with your shop account and agree; the platform returns a code on the redirect URL (valid ~2 min, single-use). With no public server, whether a 127.0.0.1 loopback redirect is allowed must be tested; if not, point redirect to a page you control and copy the whole code from the address bar, then exchange it with app_id/app_secret at https://openapi.kwaixiaodian.com/oauth2/access_token.',
        },
      },
      {
        h: { zh: '填入盈脉并测试连接', en: 'Enter credentials in YingMai and test' },
        d: {
          zh: '在盈脉的快手电商连接窗口依次填写 App ID（appkey）、App Secret、Sign Secret（若与 App Secret 相同可留空）、Access Token、Refresh Token（可空），点击「测试连接」。测试会用只读的订单列表接口（第 1 页 1 条）校验 appkey、HMAC-SHA256 签名与 token。若因企业/资质审核不满足，测试会返回可读的错误信息，这属于预期的资质门槛。',
          en: 'In YingMai’s Kuaishou dialog, enter the App ID (appkey), App Secret, Sign Secret (leave blank if identical to the App Secret), Access Token and Refresh Token (optional), then click “Test connection”. The test calls the read-only order list (page 1, 1 item) to verify the appkey, HMAC-SHA256 signature and token. If enterprise/qualification prerequisites are not met, the test returns a readable error—this is the expected eligibility gate.',
        },
      },
      {
        h: { zh: '保存与令牌刷新', en: 'Save and refresh the token' },
        d: {
          zh: '若测试通过，点击「保存并连接」开始同步。access_token 约 48 小时有效，refresh_token 约 180 天；access_token 过期后用 refresh_token 向 /oauth2/refresh_token 换新，每次刷新返回新的 refresh_token（旧的 5 分钟内失效）。',
          en: 'If the test passes, click “Save & connect” to start sync. The access token lasts about 48h and the refresh token about 180d; when the access token expires, use the refresh token at /oauth2/refresh_token to renew it—each refresh returns a new refresh token (the old one expires within 5 minutes).',
        },
      },
    ],
    notes: [
      {
        zh: '本连接器定档 restricted：商家开发者入驻须企业营业执照 + 电商销售与技术开发资质，个人不可注册，个体工商户能否过审以实际为准；适配器仅按官方文档预实现 OAuth2/签名/端点，不承诺能连上。',
        en: 'This connector is restricted: merchant-developer onboarding requires a business license with e-commerce sales and technical development scope; individuals cannot register, and whether sole proprietorships pass depends on review. The adapter only pre-implements OAuth2/signing/endpoints per official docs and does not promise a working connection.',
      },
      {
        zh: '注意区分：电商开放平台在 open.kwaixiaodian.com / openapi.kwaixiaodian.com，不是 open.kuaishou.com（通用小程序）。测试用户最多 5 名、每名每天 2000 次调用，授权关系默认 10 天后自动取消。',
        en: 'Note the distinction: the e-commerce open platform lives at open.kwaixiaodian.com / openapi.kwaixiaodian.com, not open.kuaishou.com (the general mini-program platform). Up to 5 test users at 2000 calls/day each; test authorizations auto-expire after 10 days.',
      },
      {
        zh: '主体差异：个人、个体工商户、企业与工作室中，个人明确不可注册；个体工商户能否按“企业”过审无官方书面承诺，需实际提交；企业与工作室可走商家开发者通道。对接多个卖家店铺（SaaS）还需第三方开发者资质，本连接器面向您自己的店铺。',
        en: 'Entity differences: among individuals, sole proprietorships, companies and studios, individuals are explicitly barred; there is no written guarantee that sole proprietorships pass as “enterprise”, so only an actual application tells. Companies and studios may use the merchant-developer path. Serving multiple sellers (SaaS) also needs third-party developer status; this connector targets your own shop.',
      },
      {
        zh: '买家 PII（姓名/电话/地址）受平台数据权限约束，未申请相应权限时拿不到明文；这些字段留空，不中断同步。商品与订单金额均为人民币（CNY）。',
        en: 'Buyer PII (name/phone/address) is governed by platform data permissions; without the right scope, plaintext cannot be read. These fields are left blank without breaking sync. Product and order amounts are in CNY.',
      },
      {
        zh: '所有凭证经加密后仅保存在您的本机，不会上传；App Secret/Sign Secret 仅在本机用于 OAuth 与签名，Access/Refresh Token 仅在内存与本机加密保存，不落明文磁盘。',
        en: 'All credentials are encrypted and stored only on your computer and are never uploaded. The App Secret/Sign Secret are used locally for OAuth and signing; access/refresh tokens are held in memory and encrypted on disk, never written as plaintext.',
      },
    ],
  },
  xiaohongshu: {
    updated: '2026-10-07',
    intro: {
      zh: '把您自己的小红书千帆店铺商品、订单与库存同步到盈脉。需要先在千帆开放平台完成资质审核：商家自研须用企业店主账号绑定店铺，软件服务商须为成立 1 年以上的企业。本连接器通过统一 common_controller 入口、MD5 签名调用。请注意：商家自研明确排除个人/个体工商户店，本连接器按官方文档预先实现，不承诺能连上。',
      en: 'Sync products, orders and inventory from your own Xiaohongshu Qianfan store into YingMai. First complete qualification review on the Qianfan open platform: merchant in-house must bind the shop with an enterprise store’s main account, while software providers must be a company established over 1 year. This connector calls the unified common_controller entry with MD5 signing. Note: merchant in-house explicitly excludes personal/sole-proprietor shops; this connector is pre-built per official docs and does not promise a working connection.',
    },
    scopes: [
      'ProductClient',
      'PackageClient / order polling',
      'InventoryClient',
    ],
    steps: [
      {
        h: { zh: '确认主体与店铺资质', en: 'Check entity and shop eligibility' },
        d: {
          zh: '商家自研要求“自有店铺类型非个人/个体工商户”，即必须是企业店才能使用自研应用。软件服务商须中国大陆注册企业、存续状态、成立 1 年以上、经营范围含计算机系统集成/技术开发且未在经营异常名录。个人卖家和个体工商户在千帆均无自助接入路径。',
          en: 'Merchant in-house requires “a shop that is neither personal nor a sole proprietorship”—an enterprise store—before the in-house app can be used. Software providers must be a mainland-registered, active company established over 1 year, with system-integration/technical-development scope and no abnormal-operation listing. Individual sellers and sole proprietorships have no self-serve path on Qianfan.',
        },
      },
      {
        h: { zh: '注册并完成资质审核', en: 'Register and complete qualification review' },
        d: {
          zh: '在 open.xiaohongshu.com 用邮箱注册、设置密码。创建应用前必须先完成资质审核：商家自研跳转 ARK 商家系统用店铺主账号绑定；软件服务商提交企业资质/法人实名/运营授权书。一个开放平台账号对应唯一一套企业资质与唯一角色，每个应用类型下只能创建一个应用。',
          en: 'Register at open.xiaohongshu.com with an email and set a password. Qualification review is required before creating an app: merchant in-house binds the shop via the ARK merchant system with the shop’s main account; software providers submit enterprise credentials, legal-rep real-name verification and an operation authorization. One account maps to one enterprise qualification and one role, and only one app per app type.',
        },
      },
      {
        h: { zh: '获取 accessToken', en: 'Obtain the access token' },
        d: {
          zh: '自研商家：在控制台应用管理 → 授权管理添加店铺 id → 复制授权链接给店铺主账号授权 → 获取 token，不涉及公网回调。软件服务商走标准 OAuth2 code 授权（授权页/换 token 端点以控制台为准）。本机无公网：回环（127.0.0.1）回调是否被官方允许需实测；若不允许，就把 redirect 配成您能控制的页面，手动从地址栏整段复制 code 再换 token。accessToken 约 7 天，refreshToken 约 14 天。',
          en: 'Merchant in-house: in the console under app management → authorization, add the shop id, copy the authorization link for the shop main account to approve, then obtain the token—no public callback is needed. Software providers use the standard OAuth2 code flow (follow the console for authorize/token URLs). With no public server, whether a 127.0.0.1 loopback redirect is allowed must be tested; if not, point redirect to a page you control and copy the whole code from the address bar to exchange it. The access token lasts about 7 days and the refresh token about 14 days.',
        },
      },
      {
        h: { zh: '填入盈脉并测试连接', en: 'Enter credentials in YingMai and test' },
        d: {
          zh: '在盈脉的小红书电商连接窗口依次填写店铺 ID（可空）、App ID、App Secret、Access Token、Refresh Token（可空），点击「测试连接」。测试会向 common_controller 发一次只读的订单轮询调用（第 1 页 1 条）校验 appId、MD5 签名与 accessToken。若因企业店资质不满足，测试会返回可读的错误信息，这属于预期的资质门槛。',
          en: 'In YingMai’s Xiaohongshu dialog, enter the Shop ID (optional), App ID, App Secret, Access Token and Refresh Token (optional), then click “Test connection”. The test sends a read-only order-polling call (page 1, 1 item) to common_controller to verify the appId, MD5 signature and accessToken. If enterprise-store prerequisites are not met, the test returns a readable error—this is the expected eligibility gate.',
        },
      },
      {
        h: { zh: '保存与替代方案', en: 'Save and alternatives' },
        d: {
          zh: '若测试通过，点击「保存并连接」开始同步。若因主体资质无法从本机打通，可继续用手工录入与文件导入维护商品与订单。',
          en: 'If the test passes, click “Save & connect” to start sync. If entity qualification blocks the local connection, keep maintaining products and orders via manual entry and file import.',
        },
      },
    ],
    notes: [
      {
        zh: '本连接器定档 restricted：商家自研明确排除个人/个体工商户店，软件服务商须成立 1 年以上企业；适配器仅按官方文档预实现 common_controller MD5 签名/授权/端点，不承诺能连上。',
        en: 'This connector is restricted: merchant in-house explicitly excludes personal/sole-proprietor shops, and software providers must be a company established over 1 year. The adapter only pre-implements the common_controller MD5 signing/authorization/endpoints per official docs and does not promise a working connection.',
      },
      {
        zh: '签名口径：参与验签的系统参数为 appId/timestamp/version/method（accessToken 不参与验签），按 `method?appId=..&timestamp=..&version=2.0` 后直接拼接 appSecret，整体 MD5。timestamp 是以秒为单位的 Unix 时间戳。',
        en: 'Signing: the signed system params are appId/timestamp/version/method (accessToken is excluded); concatenate as `method?appId=..&timestamp=..&version=2.0` then directly append appSecret, and MD5 the whole string. The timestamp is a Unix value counted in seconds.',
      },
      {
        zh: '主体差异：个人店、个体工商户店不能使用商家自研；软件服务商路径面向企业。对接多个卖家店铺（SaaS）需上架服务市场，本连接器面向您自己的企业店铺。',
        en: 'Entity differences: personal and sole-proprietor stores cannot use merchant in-house; the software-provider path targets companies. Serving multiple sellers (SaaS) requires publishing to the service market; this connector targets your own enterprise store.',
      },
      {
        zh: '买家 PII：订单详情需另调收件人详细地址接口，未授权时拿不到明文；这些字段留空，不中断同步。商品与订单金额均为人民币（CNY）。',
        en: 'Buyer PII: recipient detail requires a separate recipient-address call; without authorization, plaintext cannot be read. These fields are left blank without breaking sync. Product and order amounts are in CNY.',
      },
      {
        zh: '所有凭证经加密后仅保存在您的本机，不会上传；App Secret 仅在本机用于 MD5 签名，Access/Refresh Token 仅在内存与本机加密保存，不落明文磁盘。',
        en: 'All credentials are encrypted and stored only on your computer and are never uploaded. The App Secret is used locally for MD5 signing; access/refresh tokens are held in memory and encrypted on disk, never written as plaintext.',
      },
    ],
  },
};

function scEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function genericTutorial(platformId, catalog) {
  const p = (catalog || []).find((x) => x.id === platformId);
  if (!p) return null;
  const name = currentLang === 'en' ? p.name.en : p.name.zh;
  let body = '';
  if (p.connect === 'gated') {
    body = currentLang === 'en'
      ? `Direct connection for ${name} requires developer or partner approval. After you obtain the required credentials, support can be added. In the meantime, you can use manual entry and file import.`
      : `接入 ${name} 需要先取得开发者或合作伙伴资质。在您取得相应凭证后即可支持对接；在此之前，可使用手工录入与文件导入。`;
  } else if (p.connect === 'self') {
    body = currentLang === 'en'
      ? `${name} supports self-serve authorization with your own credentials. A guided setup is being prepared and will be added soon.`
      : `${name} 支持使用您自己的凭证自助授权，逐步接入指引正在准备中，将尽快提供。`;
  } else {
    body = currentLang === 'en'
      ? `Direct order access for ${name} is mainly available to enterprises and certified providers. Individual sellers usually cannot self-connect; manual entry and file import remain available.`
      : `${name} 的订单类接口主要面向企业及认证服务商，个人卖家通常无法自助打通；可继续使用手工录入与文件导入。`;
  }
  return {
    updated: '2026-10-06',
    generic: true,
    name,
    body,
    docs: p.docs, signup: p.signup,
  };
}

function renderTutorial(platformId, catalog) {
  const tut = TUTORIALS[platformId] || genericTutorial(platformId, catalog);
  if (!tut) return;
  if (window.closeModal) closeModal();

  const backdrop = document.createElement('div');
  backdrop.id = 'modalBackdrop';
  backdrop.className = 'modal-backdrop';

  let content = '';
  if (tut.generic) {
    content = `
      <p class="sc-tut-body">${scEsc(tut.body)}</p>
      <div class="sc-tut-links">
        ${tut.docs ? `<a href="${scEsc(tut.docs)}" target="_blank" rel="noopener">${currentLang === 'en' ? 'Official docs' : '官方文档'}</a>` : ''}
        ${tut.signup && tut.signup !== tut.docs ? `<a href="${scEsc(tut.signup)}" target="_blank" rel="noopener">${currentLang === 'en' ? 'Platform site' : '前往平台'}</a>` : ''}
      </div>`;
  } else {
    const scopes = (tut.scopes || []).map((s) => `<code class="sc-scope">${scEsc(s)}</code>`).join('');
    const steps = tut.steps.map((s, i) => `
      <div class="sc-step">
        <div class="sc-step-no">${i + 1}</div>
        <div class="sc-step-text">
          <div class="sc-step-h">${scEsc(currentLang === 'en' ? s.h.en : s.h.zh)}</div>
          <div class="sc-step-d">${scEsc(currentLang === 'en' ? s.d.en : s.d.zh)}</div>
        </div>
      </div>`).join('');
    const notes = tut.notes.map((n) => `<li>${scEsc(currentLang === 'en' ? n.en : n.zh)}</li>`).join('');
    content = `
      <p class="sc-tut-body">${scEsc(currentLang === 'en' ? tut.intro.en : tut.intro.zh)}</p>
      ${scopes ? `<div class="sc-scopes"><div class="sc-scopes-label">${currentLang === 'en' ? 'Required read scopes' : '需要的读取权限'}</div>${scopes}</div>` : ''}
      <div class="sc-steps">${steps}</div>
      <ul class="sc-tut-notes">${notes}</ul>`;
  }

  const title = currentLang === 'en' ? 'Setup guide' : '接入教程';
  backdrop.innerHTML = `
    <div class="modal-card sc-tut-card" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="modal-head">
        <span class="modal-title">${title}</span>
        <button class="modal-close" aria-label="close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        ${content}
        <div class="sc-tut-foot-row">
          <span class="sc-tut-updated">${currentLang === 'en' ? 'Updated' : '更新日期'}：${scEsc(tut.updated)}</span>
          <button class="btn btn-ghost btn-sm" id="scTutUpdate">${currentLang === 'en' ? 'Check for updates' : '检查教程更新'}</button>
        </div>
        <div class="sc-tut-status" id="scTutStatus"></div>
      </div>
    </div>`;
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) closeModal(); });
  document.body.appendChild(backdrop);

  document.getElementById('scTutUpdate').onclick = async () => {
    const status = document.getElementById('scTutStatus');
    status.textContent = currentLang === 'en' ? 'Checking…' : '正在检查…';
    const ok = await window.SCTutorial.checkUpdate();
    if (ok) {
      status.textContent = currentLang === 'en' ? 'Tutorials updated.' : '教程已更新。';
      window.SCTutorial.open(platformId, catalog);
    } else {
      status.textContent = currentLang === 'en'
        ? `Using the built-in guide (updated ${tut.updated}).`
        : `当前使用内置教程（更新日期 ${tut.updated}）。`;
    }
  };
}

// 从项目公开仓库拉取最新教程；失败时使用内置版本（不报错）
async function checkUpdate() {
  const url = 'https://raw.githubusercontent.com/bin1732/yingmai/main/web/data/tutorials.json';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return false;
    const json = await r.json();
    if (json && json.tutorials && typeof json.tutorials === 'object') {
      Object.assign(TUTORIALS, json.tutorials);
      return true;
    }
    return false;
  } catch { return false; }
}

window.SCTutorial = { open: renderTutorial, checkUpdate };
