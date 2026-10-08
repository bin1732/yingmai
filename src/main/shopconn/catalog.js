// 平台接入目录：如实标注各平台的接入方式、资质要求与官方入口。
// 只有真实连通并验证通过后，平台才会标记为“可接入”。
// 灵感引擎工坊 · bin1732

// connect:
//   available  已提供适配器并通过真实连通验证
//   self       卖家可用自有凭证自助授权，适配器将逐步提供
//   gated      需先取得开发者/合作伙伴资质
//   restricted 订单类接口主要面向企业或认证服务商，个人卖家无法自助打通

const CATALOG = [
  // ── 跨境：独立站与平台 ──
  {
    id: 'shopify', category: 'crossborder',
    name: { zh: 'Shopify', en: 'Shopify' },
    connect: 'available',
    need: {
      zh: '在店铺后台创建自定义应用，开通订单、商品与库存读取权限，安装后获取 Admin API 访问令牌。',
      en: 'Create a custom app in your store admin, enable read access for orders, products and inventory, install it, and obtain the Admin API access token.',
    },
    docs: 'https://shopify.dev/docs/api/admin-rest',
    signup: 'https://www.shopify.com/',
  },
  {
    id: 'amazon', category: 'crossborder',
    name: { zh: 'Amazon（亚马逊）', en: 'Amazon' },
    connect: 'self',
    need: {
      zh: '注册 SP-API 开发者并创建私有应用，在 AWS 配置具备 SP-API 权限的 IAM 用户；在 Seller Central 自助授权拿到 Refresh Token，连同 LWA 凭证与 AWS 密钥一起填入盈脉即可本机直连。个人、个体工商户、企业与工作室均可申请，资料审核以 Amazon 为准。',
      en: 'Register as an SP-API developer and create a private app, configure an IAM user with SP-API permissions in AWS, self-authorize in Seller Central to obtain a refresh token, then enter the LWA credentials and AWS keys into YingMai for local direct connection. Individuals, sole proprietors, companies and studios may apply; profile review is at Amazon’s discretion.',
    },
    docs: 'https://developer-docs.amazon.com/sp-api/docs/welcome',
    signup: 'https://developer.amazon.com/',
  },
  {
    id: 'ebay', category: 'crossborder',
    name: { zh: 'eBay', en: 'eBay' },
    connect: 'self',
    need: {
      zh: '加入 eBay Developers Program（约 1 个工作日审批）生成 Production keyset，在 Developer Portal 网页完成一次授权取得 User Refresh Token，连同 App ID、Cert ID 一起填入盈脉即可本机直连。个人、个体工商户、企业与工作室均可注册，资料审核以 eBay 为准。',
      en: 'Join the eBay Developers Program (about one business day to approve), create your Production keyset, complete consent on the Developer Portal to obtain a user refresh token, then enter it with your App ID and Cert ID into YingMai for local direct connection. Individuals, sole proprietors, companies and studios may register; review is at eBay’s discretion.',
    },
    docs: 'https://www.edp.ebay.com/develop/guides/sell/authorization',
    signup: 'https://developer.ebay.com/',
  },
  {
    id: 'tiktokshop', category: 'crossborder',
    name: { zh: 'TikTok Shop', en: 'TikTok Shop' },
    connect: 'gated',
    need: {
      zh: '需在 Partner Center 注册并登记为开发者、创建 Custom App 并通过卖家自用 security/合规审核（US/UK 强制、约 3 周以上）后取得 App Key/Secret；再对店铺授权拿到 Access/Refresh Token 与 shop_cipher，填入盈脉即可本机直连。个人、个体工商户、企业与工作室均可申请，主体能否过审以官方为准。',
      en: 'Register on the Partner Center and enroll as a developer, create a Custom app and pass seller-in-use security/compliance review (mandatory in US/UK, about 3+ weeks) to obtain the App Key/secret; then authorize your shop to get the access/refresh token and shop_cipher, and enter them into YingMai for local direct connection. Individuals, sole proprietors, companies and studios may apply; approval is at the platform’s discretion.',
    },
    docs: 'https://partner.tiktokshop.com/docv2/page/tts-developer-guide',
    signup: 'https://partner.tiktokshop.com/',
  },
  {
    id: 'shopee', category: 'crossborder',
    name: { zh: 'Shopee（虾皮）', en: 'Shopee' },
    connect: 'gated',
    need: {
      zh: '注册 Shopee Open Platform 开发者并创建 Seller In-house App，先拿 Test 凭证沙箱联调，Go Live（约 24h 自动过审）后取得 Live Partner ID/Key；再完成店铺授权拿到 Access/Refresh Token 填入盈脉即可本机直连。个人、个体工商户、企业与工作室均可申请（巴西站已关闭 Individual Seller），资料审核 Seller 类 ≤7 个工作日。',
      en: 'Register as a Shopee Open Platform developer and create a Seller In-house app; test in the sandbox first, then Go Live (about 24h auto-review) to obtain the live Partner ID/key. Complete shop authorization and enter the access/refresh token into YingMai for local direct connection. Individuals, sole proprietors, companies and studios may apply (Individual Seller is closed in Brazil); profile review takes up to 7 business days for Seller-type apps.',
    },
    docs: 'https://open.shopee.com/documents/v2/v2.shop.get_shop_info?module=92&type=1',
    signup: 'https://open.shopee.com/',
  },
  {
    id: 'aliexpress', category: 'crossborder',
    name: { zh: 'AliExpress（速卖通）', en: 'AliExpress' },
    connect: 'gated',
    need: {
      zh: '自研接入必须企业主体：企业营业执照、入驻聚石塔、软著/源码/系统架构，资料审核约 7 个工作日，个人无法自助。通过审核拿到 AppKey/AppSecret 并完成店铺授权后，连同 Access Token 一起填入盈脉即可本机直连。个体工商户能否按企业主体过审待与官方确认。',
      en: 'In-house integration requires an enterprise entity: a business license, onboarding to Jushita (Alibaba Cloud’s designated hosting environment), software copyright/source/system architecture, and about 7 business days of review; individuals cannot self-connect. Once approved, enter the AppKey/AppSecret together with the authorized access token into YingMai for local direct connection. Whether sole proprietorships count as the enterprise entity must be confirmed with the platform.',
    },
    docs: 'https://developer.alibaba.com/docs/doc.htm?treeId=556&articleId=108974&docType=1',
    signup: 'https://open.aliexpress.com/',
  },
  {
    id: 'lazada', category: 'crossborder',
    name: { zh: 'Lazada（来赞达）', en: 'Lazada' },
    connect: 'gated',
    need: {
      zh: '需在 open.lazada.com 走“For Lazada Sellers（自营卖家自用）”通道注册开发者、创建应用并选应用类目，经 Lazada 管理员人工审核后取得 App Key/Secret；再完成店铺授权拿到 Access/Refresh Token，填入盈脉即可本机直连（按国家分别打对应 host）。个人、个体工商户、企业与工作室均可申请，主体能否过审以官方为准。',
      en: 'Register on open.lazada.com via the “For Lazada Sellers” in-house channel, create an app and pick an app category; after Lazada admins review and approve it, obtain the App Key/secret. Then authorize your shop to get the access/refresh token and enter them into YingMai for local direct connection (each country hits its own host). Individuals, sole proprietors, companies and studios may apply; approval is at the platform’s discretion.',
    },
    docs: 'https://open.lazada.com/',
    signup: 'https://open.lazada.com/apps/user/register',
  },

  // ── 货源平台 ──
  {
    id: '1688', category: 'sourcing',
    name: { zh: '1688 采购批发', en: '1688 Wholesale' },
    connect: 'gated',
    need: {
      zh: '买家侧跨店选品/商详只读 API 需企业实名认证 + 代发/跨境选品解决方案白名单，纯个人（仅身份证）无法自助；个体工商户能否过审以官方为准。自用型应用不强制聚石塔，但需登记本机出口 IP 白名单。具备 App Key/Secret 与 OAuth Access Token 后即可本机直连选品。',
      en: 'Buyer-side cross-store sourcing/detail read APIs require enterprise real-name verification plus the dropshipping/cross-border selection solution whitelist; pure individuals (ID card only) cannot self-connect. Whether sole proprietorships pass is up to the platform. In-house apps do not require Jushita, but your outbound IP must be whitelisted. Once you hold an App Key/Secret and OAuth access token, you can source locally.',
    },
    docs: 'https://open.1688.com/',
    signup: 'https://aop.alibaba.com/',
  },

  // ── 国内平台：订单类接口多为企业/认证服务商门槛 ──
  {
    id: 'taobao', category: 'domestic',
    name: { zh: '淘宝 / 天猫', en: 'Taobao / Tmall' },
    connect: 'restricted',
    need: {
      zh: '自研商家后台系统仅对企业主体（企业支付宝）+ 天猫卖家开放，淘宝集市 C 店被官方排除；且订单/收件人等敏感接口必须在聚石塔云内调用。盈脉为本地直连桌面工具，即使企业主体获批也无法从本机打通这些接口，个人/个体通常无法自助。可继续使用手工录入与文件导入。',
      en: 'The merchant in-house backend is open only to enterprise (corporate Alipay) Tmall sellers; Taobao C2C shops are explicitly excluded, and order/recipient sensitive APIs must run inside Jushita cloud. YingMai is a local-direct desktop tool, so even an approved enterprise cannot call these from this machine; individuals/sole proprietors usually cannot self-connect. Manual entry and file import remain available.',
    },
    docs: 'https://open.taobao.com/',
    signup: 'https://open.taobao.com/',
  },
  {
    id: 'jd', category: 'domestic',
    name: { zh: '京东', en: 'JD.com' },
    connect: 'restricted',
    need: {
      zh: '订单等敏感接口必须在京东云鼎内发起，云鼎外调用会被拦截；商家自研应用需企业 POP 店铺审核 + 云鼎入驻。盈脉为本地直连桌面工具，即使企业店铺获批也无法从本机打通这些接口；个人店/个体店能否过审以平台为准。可继续使用手工录入与文件导入。',
      en: 'Order and other sensitive APIs must be called inside JD Yunding (cloud); calls outside Yunding are blocked. In-house apps require an enterprise POP shop review plus Yunding onboarding. YingMai is a local-direct desktop tool, so even an approved enterprise shop cannot call these from this machine; whether individual/sole-proprietor shops pass review is up to JD. Manual entry and file import remain available.',
    },
    docs: 'https://open.jd.com/',
    signup: 'https://open.jd.com/',
  },
  {
    id: 'pdd', category: 'domestic',
    name: { zh: '拼多多', en: 'Pinduoduo' },
    connect: 'restricted',
    need: {
      zh: '商家自研应用仅供本店、上线须部署入多多云，订单解密云外仅 1 次/10 秒测试配额；“拼多多商家（自研）”角色要求经招商小二认证的品牌商/大商家，普通中小店可能被驳回，纯个人仅能做 CPS 导购、不能读本店订单。盈脉为本地直连桌面工具，生产环境无法从本机打通。可继续使用手工录入与文件导入。',
      en: 'Merchant in-house apps are for the shop’s own use only and must be deployed into Duoduo Cloud to go live; order decryption outside the cloud is limited to 1 call/10s for testing. The “Pinduoduo merchant (in-house)” role requires a brand/large merchant certified by the BD team; small shops may be rejected, and pure individuals can only do CPS promotion and cannot read their own shop orders. YingMai is a local-direct desktop tool and cannot run production calls from this machine. Manual entry and file import remain available.',
    },
    docs: 'https://open.pinduoduo.com/',
    signup: 'https://open.pinduoduo.com/',
  },
  {
    id: 'douyin', category: 'domestic',
    name: { zh: '抖音电商（抖店）', en: 'Douyin (Douyin Shop)' },
    connect: 'restricted',
    need: {
      zh: '抖店开放平台第三方工具型应用仅企业可入驻，个人和个体工商户无法注册；自研自用（商家后台系统）还需企业营业执照 + 电商类国家软件著作权 + 软著/开发者/店铺主体三者一致，且有 IP 白名单。盈脉为本地直连桌面工具，出口动态 IP 需在控制台配置白名单，本连接器按官方文档预实现签名/授权，不承诺能连上。可继续使用手工录入与文件导入。',
      en: 'The Douyin Shop open platform lets only enterprises register as third-party developers; individuals and sole proprietorships cannot onboard. In-house merchant apps additionally require a business license, an e-commerce software copyright, and three-way entity consistency, plus an IP whitelist. YingMai is a local-direct desktop tool whose dynamic outbound IP must be whitelisted in the console. This connector pre-implements signing/authorization per official docs and does not promise a working connection. Manual entry and file import remain available.',
    },
    docs: 'https://op.jinritemai.com/docs',
    signup: 'https://op.jinritemai.com/',
  },
  {
    id: 'kuaishou', category: 'domestic',
    name: { zh: '快手电商（快手小店）', en: 'Kuaishou (Kwaixiaodian)' },
    connect: 'restricted',
    need: {
      zh: '快手电商开放平台商家开发者入驻须上传企业营业执照，经营范围需具备电商产品销售与技术开发资质，审核约 1–3 个工作日；个人不可注册，个体工商户营业执照是否被认定为“企业”以实际审核为准。本连接器按官方文档预实现 OAuth2/HMAC 签名，不承诺个人或个体一定能连上。可继续使用手工录入与文件导入。',
      en: 'Kuaishou E-commerce onboarding for merchant developers requires a business license whose scope covers e-commerce sales and technical development, reviewed in about 1–3 business days; individuals cannot register, and whether a sole-proprietorship license counts as “enterprise” depends on review. This connector pre-implements OAuth2/HMAC signing per official docs and does not promise individuals or sole proprietors can connect. Manual entry and file import remain available.',
    },
    docs: 'https://open.kwaixiaodian.com/',
    signup: 'https://open.kwaixiaodian.com/',
  },
  {
    id: 'xiaohongshu', category: 'domestic',
    name: { zh: '小红书电商（千帆）', en: 'Xiaohongshu (Qianfan)' },
    connect: 'restricted',
    need: {
      zh: '千帆商家自研明确要求“自有店铺类型非个人/个体工商户”（须企业店）；软件服务商须中国大陆注册企业、成立 1 年以上、经营范围含技术开发。个人卖家与个体工商户在千帆均无自助接入路径。本连接器按官方文档预实现 common_controller MD5 签名/授权，不承诺能连上。可继续使用手工录入与文件导入。',
      en: 'Qianfan merchant in-house explicitly requires a shop that is neither personal nor a sole proprietorship (an enterprise store); software providers must be a mainland-registered company established over 1 year with technical development in scope. Individual sellers and sole proprietorships have no self-serve path on Qianfan. This connector pre-implements the common_controller MD5 signing/authorization per official docs and does not promise a working connection. Manual entry and file import remain available.',
    },
    docs: 'https://open.xiaohongshu.com/',
    signup: 'https://open.xiaohongshu.com/',
  },
];

module.exports = { CATALOG };
