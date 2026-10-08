/* ============================================
   盈脉 · 电商工作台短语翻译引擎（真双语）
   说明：以中文原文为键，切换语言时对文本节点做
   最长匹配替换，静态与动态内容统一覆盖。
   ============================================ */
const PHRASES = {
  // 分组标题
  "经营总览": "Overview",
  "订单与履约": "Orders & Fulfillment",
  "商品与供应链": "Products & Supply Chain",
  "运营与增长": "Operations & Growth",
  "财务与工具": "Finance & Tools",
  "知识库": "Knowledge Base",
  "系统": "System",

  // 导航
  "仪表盘": "Dashboard",
  "分析历史": "Analysis History",
  "订单管理": "Orders",
  "发货管理": "Shipping",
  "售后管理": "After-Sales",
  "商品库": "Products",
  "店铺商品": "Listings",
  "库存管理": "Inventory",
  "仓库管理": "Warehouses",
  "采购管理": "Purchasing",
  "供应商管理": "Suppliers",
  "供应商": "Suppliers",
  "选品分析": "Product Research",
  "竞品分析": "Competitor Analysis",
  "评论分析": "Review Analysis",
  "Listing生成": "Listing Builder",
  "客服话术": "Customer Service",
  "关键词检查": "Keyword Check",
  "广告ACOS": "Ad ACOS",
  "客户管理": "Customers",
  "经营损益": "Profit & Loss",
  "预警中心": "Alerts",
  "利润计算": "Profit Calculator",
  "物流对比": "Logistics",
  "合规检查": "Compliance",
  "平台规范": "Platform Rules",
  "提示词库": "Prompt Library",
  "文案润色": "Text Polish",
  "入行指引": "Getting Started",
  "新手入行": "Getting Started",
  "设置": "Settings",

  // 侧边栏分组
  "店铺连接": "Shop Connections",
  "客户与经营": "Customers & Operations",

  // 店铺连接页
  "＋ 连接店铺": "＋ Connect a store",
  "同步设置": "Sync settings",
  "自动同步": "Auto sync",
  "同步间隔": "Sync interval",
  "立即同步全部": "Sync all now",
  "我的店铺": "My stores",
  "可接入平台": "Connectable platforms",
  "可接入": "Connectable",
  "可自助接入": "Self-serve",
  "需开发者资质": "Developer access",
  "暂不支持直连": "No direct access",
  "连接": "Connect",
  "教程": "Guide",
  "官方文档": "Official docs",
  "前往平台": "Platform site",
  "接入教程": "Setup guide",
  "如何获取凭证": "How to get credentials",
  "查看接入教程": "View setup guide",
  "测试连接": "Test connection",
  "保存并连接": "Save & connect",
  "正在测试…": "Testing…",
  "连接失败": "Connection failed",
  "正在连接并首次同步…": "Connecting and running first sync…",
  "上次同步": "Last sync",
  "尚未同步": "Not synced yet",
  "同步日志": "Sync log",
  "立即同步": "Sync now",
  "建立商品档案": "Build products",
  "启用": "Enabled",
  "删除连接": "Remove connection",

  // 通用按钮/动作
  "发送": "Send",
  "取消": "Cancel",
  "保存中...": "Saving...",
  "关闭": "Close",
  "复制结果": "Copy Result",
  "已复制": "Copied",
  "下一步": "Next",
  "上一步": "Back",
  "跳过": "Skip",
  "开始使用": "Get Started",
  "计算利润": "Calculate Profit",
  "计算广告指标": "Calculate Ad Metrics",
  "开始改写": "Start Rewrite",
  "加载示例数据": "Load Sample Data",
  "清除示例数据": "Clear Sample Data",
  "导出Excel": "Export Excel",
  "选择模型": "Select Model",
  "新增商品": "Add Product",
  "新增订单": "Add Order",
  "新增库存": "Add Inventory",
  "新增采购单": "Add Purchase Order",
  "新增供应商": "Add Supplier",
  "新增售后单": "Add After-Sales Case",
  "下单": "Order",
  "删除": "Delete",
  "发货": "Ship",
  "解决": "Resolve",
  "点此前往": "Go",
  "官方获取": "Get one here",
  "简体中文": "简体中文",

  // 状态
  "在线": "Online",
  "离线": "Offline",
  "正常": "Normal",
  "处理中": "Processing",
  "未配置": "Not Configured",
  "待付款": "Pending Payment",
  "已付款": "Paid",
  "待发货": "To Ship",
  "已发货": "Shipped",
  "已完成": "Completed",
  "已取消": "Cancelled",
  "草稿": "Draft",
  "已下单": "Ordered",
  "已入库": "Received",
  "已解决": "Resolved",
  "已关闭": "Closed",
  "盈利": "Profit",
  "亏损": "Loss",
  "广告盈利": "Ad Profitable",
  "广告亏损": "Ad Unprofitable",
  "仅退款": "Refund Only",
  "退货退款": "Return & Refund",
  "换货": "Exchange",

  // 表格表头 / 字段
  "订单号": "Order No.",
  "采购单号": "PO No.",
  "平台": "Platform",
  "商品": "Product",
  "商品名称": "Product Name",
  "产品名称": "Product Name",
  "数量": "Qty",
  "单价": "Unit Price",
  "金额": "Amount",
  "总额": "Total",
  "买家": "Buyer",
  "状态": "Status",
  "操作": "Actions",
  "名称": "Name",
  "成本": "Cost",
  "采购成本": "Purchase Cost",
  "售价": "Price",
  "目标售价": "Target Price",
  "预期售价": "Expected Price",
  "利润": "Profit",
  "备注": "Notes",
  "类型": "Type",
  "原因": "Reason",
  "仓库": "Warehouse",
  "库存数量": "Stock Qty",
  "安全库存": "Safety Stock",
  "关键词": "Keywords",
  "竞品": "Competitor",
  "评论": "Reviews",
  "联系人": "Contact",
  "电话": "Phone",
  "地址": "Address",
  "场景": "Scenario",
  "客服": "Support",
  "选品": "Selection",
  "语言": "Language",
  "菜单": "Menu",
  "主题": "Theme",
  "主营产品": "Main Products",
  "物流单号": "Tracking No.",
  "快递公司": "Shipping Company",
  "毛利率": "Margin",
  "当前ACOS": "Current ACOS",
  "盈亏平衡ACOS": "Break-even ACOS",
  "每单广告成本": "Ad Cost per Order",

  // 仪表盘
  "工作台总览": "Workbench Overview",
  "你的电商经营驾驶舱": "Your e-commerce command center",
  "商品总数": "Total Products",
  "今日分析": "Analyses Today",
  "支持平台": "Platforms",
  "AI引擎": "AI Engine",
  "内置": "Built-in",
  "本地商品库": "Local product library",
  "AI分析次数": "AI analyses",
  "分析次数": "Analyses",
  "国内 + 跨境": "Domestic + Cross-border",
  "本地运行": "Runs locally",
  "近7日分析趋势": "7-Day Analysis Trend",
  "平台分布": "Platform Distribution",
  "国内平台": "Domestic",
  "跨境平台": "Cross-border",
  "快捷入口": "Quick Access",
  "商品管理": "Products",
  "AI引擎状态": "AI Engine Status",
  "周一": "Mon", "周二": "Tue", "周三": "Wed", "周四": "Thu",
  "周五": "Fri", "周六": "Sat", "周日": "Sun",
  "每日销售热力图": "Daily Sales Heatmap",
  "按订单创建日期汇总的每日销售额，颜色越深表示当天销售额越高。":
    "Daily sales totaled by order date. Darker cells indicate higher sales that day.",

  // 空状态
  "暂无数据": "No data",
  "暂无订单": "No orders yet",
  "暂无待发货订单": "No orders to ship",
  "暂无售后单": "No after-sales cases",
  "暂无库存记录": "No inventory records",
  "暂无采购单": "No purchase orders",
  "暂无供应商": "No suppliers",
  "暂无分析记录": "No analysis records",
  "暂无商品，点击右上角": "No products yet. Click the top-right button",

  // 页面标题/副标题
  "全部订单统一管理": "Manage all orders in one place",
  "待发货订单处理与物流跟踪": "Process shipments and track packages",
  "退款退货全流程记录": "Track refunds and returns end to end",
  "管理你的商品，记录成本与售价": "Manage products and track cost and price",
  "实时库存与安全库存预警": "Live stock with safety-stock alerts",
  "采购订单全流程跟踪": "Track purchase orders through every stage",
  "供应商档案与联系方式": "Supplier profiles and contact details",
  "所有AI分析记录，可回溯可导出": "All AI analyses, searchable and exportable",

  // 选品/竞品/评论/Listing/客服/关键词
  "选品深度分析": "In-depth Product Research",
  "竞品深度拆解": "In-depth Competitor Analysis",
  "评论分析器": "Review Analyzer",
  "Listing智能生成": "Smart Listing Builder",
  "客服话术生成器": "Customer Service Script Generator",
  "标题关键词检查": "Title Keyword Check",
  "广告ACOS计算器": "Ad ACOS Calculator",
  "利润计算器": "Profit Calculator",
  "平台规范中心": "Platform Rules Center",
  "新手入行指引": "New Seller Guide",
  "物流方案对比": "Logistics Comparison",
  "产品名称与核心卖点": "Product name and key selling points",
  "已知信息（价格/卖点/差评等）": "Known info (price, selling points, negative reviews)",
  "竞品名称/链接": "Competitor name / link",
  "目标关键词（可选）": "Target keywords (optional)",
  "目标人群、已有货源、想避开的竞品等": "Target audience, existing supply, competitors to avoid",
  "补充（目标人群/差异化）": "Extra (audience / differentiation)",
  "补充信息（可选）": "Additional info (optional)",
  "具体情况描述": "Describe the situation",
  "产品成本 (¥)": "Product Cost (¥)",
  "商品售价 (¥)": "Selling Price (¥)",
  "平台佣金 (%)": "Platform Fee (%)",
  "支付手续费 (%)": "Payment Fee (%)",
  "其他费用占比 (%)": "Other Fees (%)",
  "单次点击成本 CPC (¥)": "Cost per Click CPC (¥)",
  "转化率 CVR (%)": "Conversion Rate CVR (%)",
  "目标ACOS (%)": "Target ACOS (%)",
  "商品采购成本": "Product purchase cost",
  "国内物流": "Domestic shipping",
  "国际/尾程运费": "International / last-mile shipping",
  "包装材料": "Packaging",
  "广告费（每单）": "Ad cost (per order)",
  "退款率 (%)": "Refund Rate (%)",
  "国内快递参考": "Domestic shipping reference",
  "国际物流方案": "International shipping options",
  "AI深度分析": "In-depth AI Analysis",
  "AI生成Listing": "Generate Listing",
  "生成回复": "Generate Reply",
  "AI提炼痛点": "Extract pain points",
  "拆解报告": "Breakdown Report",
  "分析报告": "Analysis Report",
  "评论洞察": "Review Insights",
  "关键词分析": "Keyword Analysis",
  "广告分析": "Ad Analysis",
  "计算结果": "Result",
  "Listing草稿": "Listing Draft",
  "建议回复": "Suggested Reply",
  "检查关键词覆盖": "Check keyword coverage",
  "改写结果": "Rewritten Result",
  "改写风格": "Rewrite Style",
  "自然口语": "Natural & Casual",
  "专业可信": "Professional & Credible",
  "轻松聊天": "Friendly Chat",
  "粘贴AI生成的文本": "Paste the text you want polished",
  "把AI生成的商品描述、文案粘贴到这里...": "Paste your AI-generated product copy here...",
  "润色中...": "Polishing...",
  "请输入文本": "Please enter text",

  // 设置
  "外观": "Appearance",
  "主题模式": "Theme",
  "界面语言": "Language",
  "用户引导": "Onboarding",
  "启动时显示引导": "Show tour on startup",
  "AI引擎配置": "AI Engine Settings",
  "服务商预设": "Provider",
  "API地址 (Base URL)": "API Address (Base URL)",
  "API Key（云端模型必填，本地留空）": "API Key (required for cloud, leave blank for local)",
  "模型": "Model",
  "数据管理": "Data Management",
  "关于": "About",
  "内置助手": "Built-in Assistant",
  "内置助手（默认，无需网络）": "Built-in Assistant (default, offline)",
  "内置助手无需检测，开箱即用": "The built-in assistant works out of the box",
  "LM Studio（本地）": "LM Studio (local)",
  "Ollama（用户本地）": "Ollama (local)",
  "未配置模型": "No model configured",
  "正在检测...": "Detecting...",
  "检测失败": "Detection failed",
  "计算失败": "Calculation failed",
  "已保存，立即生效": "Saved and active now",
  "已添加": "Added",
  "已填入提示词模板": "Prompt template inserted",
  "示例数据已加载，可前往订单、库存等页面查看": "Sample data loaded. Visit Orders or Inventory to explore.",
  "示例数据已清除": "Sample data cleared",
  "确认删除？": "Confirm delete?",
  "确认清除全部示例数据？": "Clear all sample data?",
  "未检测到本地模型。请确认Ollama或LM Studio已启动。":
    "No local models found. Make sure Ollama or LM Studio is running.",
  "选择云端服务商后，填入Key点\"检测可用模型\"":
    "Pick a cloud provider, enter your key, then click Detect Available Models.",
  "请到设置页配置云端API": "Please configure a cloud API in Settings",
  "请到设置页配置": "Please configure in Settings",
  "请先填写API地址和Key": "Please enter the API address and key first",
  "未配置AI引擎": "AI engine not configured",
  "新手常见错误": "Common beginner mistakes",

  // 设置 · 外观与关闭行为
  "浅色": "Light",
  "深色": "Dark",
  "关闭窗口时": "When closing the window",
  "每次询问": "Ask every time",
  "最小化到托盘，继续运行": "Minimize to tray and keep running",
  "直接退出工作台": "Exit the app",

  // 设置 · AI 引擎
  "通义千问": "Qwen",
  "智谱GLM": "Zhipu GLM",
  "月之暗面": "Moonshot",
  "硅基流动": "SiliconFlow",
  "选择服务商后自动填写，也可手动输入": "Filled automatically after choosing a provider, or enter manually",
  "检测可用模型": "Check available models",
  "检测后显示模型": "Models appear after checking",
  "检测本地大模型": "Detect local models",
  "保存配置": "Save configuration",
  "检测中...": "Checking...",

  // 设置 · 数据管理
  "导出数据": "Export data",
  "导入数据": "Import data",
  "订单": "Orders",
  "库存": "Inventory",
  "采购": "Purchasing",
  "售后": "After-sales",
  "导出表格（CSV）": "Export table (CSV)",
  "导出完整备份（JSON）": "Export full backup (JSON)",
  "导入 CSV 前请先选择类型": "Select a type before importing CSV",
  "示例数据": "Sample data",
  "导入 CSV 请先选择对应类型；JSON 备份文件无需选择类型。建议先用本工作台导出的表格作为模板填写。":
    "Select the matching type before importing CSV; JSON backups need no type. We recommend exporting a table from this app first and using it as the template.",
  "可以加载一套示例数据，快速了解从采购、库存到订单、售后的基本流程。示例数据可随时一键清除，不会影响你的真实数据。":
    "Load a sample dataset to quickly see the basic flow from purchasing and inventory to orders and after-sales. Sample data can be cleared anytime without affecting your real data.",

  // 设置 · 手机访问
  "手机访问（同一局域网）": "Mobile access (same LAN)",
  "访问码（可选，建议设置，防止同网络其他人打开）":
    "Access code (optional; recommended to stop others on the same network opening it)",
  "留空则不需要访问码": "Leave empty for no access code",
  "开启手机访问": "Enable mobile access",
  "手机和电脑连接同一个 Wi‑Fi 后，用手机浏览器扫描二维码，即可在手机上使用工作台，外出看数据、回消息更方便。":
    "Connect your phone and computer to the same Wi‑Fi, then scan the QR code with your phone browser to use the workbench on your phone — handy for checking data or replying while away.",
  "1. 手机连接同一 Wi‑Fi": "1. Connect your phone to the same Wi‑Fi",
  "2. 用手机浏览器扫码或输入地址": "2. Scan the code with your phone browser or enter the address",
  "3. 如设置了访问码，按提示输入": "3. Enter the access code if one is set",
  "首次开启若出现系统网络提示，请选择“允许”（专用网络）。":
    "If a system network prompt appears on first enable, choose \"Allow\" (private network).",
  "在手机浏览器里可使用“添加到主屏幕”，方便下次打开。":
    "In your phone browser, use \"Add to Home Screen\" for quicker access next time.",
  "二维码": "QR code",
  "本地运行 · 数据保存在本机 · 支持国内与跨境平台":
    "Runs locally · Data stays on this computer · Supports domestic and cross-border platforms",

  // 利润 / ACOS 图表标题与说明（整句，避免片段替换残留）
  "敏感性": "Sensitivity",
  "📈 售价—利润敏感性": "📈 Price–Profit Sensitivity",
  "在当前成本与费率下，不同售价对应的利润与利润率，帮助选择更合适的定价。":
    "At the current cost and fee rates, shows profit and margin at different prices to help choose a better price.",
  "📈 点击成本—ACOS 曲线": "📈 CPC–ACOS Curve",
  "在当前转化率下，不同单次点击成本对应的 ACOS，虚线为盈亏平衡 ACOS。":
    "At the current conversion rate, shows ACOS at different CPC values; the dashed line marks break-even ACOS.",
  "未开启": "Off",

  // 悬浮助手
  "遇到问题了？说说看": "Got a question? Let's talk",
  "输入你的电商问题...": "Ask your e-commerce question...",
  "正在为您查询...": "Looking that up for you...",
  "你好！我专注于帮您解决实际的电商问题，比如平台规则解读、费用计算或者操作指导。":
    "Hi! I help with practical e-commerce tasks such as platform rules, fee calculations, and step-by-step guidance.",

  // 引导文案
  "欢迎使用盈脉": "Welcome to YingMai",
  "电商智能助手。接下来带你快速了解核心功能，随时点✕跳过。":
    "Your e-commerce assistant. Take this quick tour of the key features, or press ✕ to skip.",
  "点右下角圆球，随时问任何电商问题。选品、平台规则、利润测算、客服话术都能答。":
    "Click the button in the bottom-right corner anytime for help with research, rules, profit, and support scripts.",
  "输入产品和成本，AI分析市场需求、竞争度、利润空间。也可拆解竞品弱点。":
    "Enter a product and its cost to analyze demand, competition, and profit — or break down a competitor.",
  "利润计算器自动算保本价和利润率，ACOS计算器判断广告是否划算。":
    "The profit calculator finds your break-even price and margin; the ACOS calculator checks if ads pay off.",
  "从没做过电商？从准备身份证到出单的完整指引，国内店和跨境店都有。":
    "New to e-commerce? Follow a complete guide from ID preparation to first sale, for both domestic and cross-border.",
  "默认内置模型，无需联网。有自己的API Key可在这里接入获得更强能力。":
    "The built-in model works offline. Add your own API key here for more capable models.",

  // 物流
  "根据包裹重量、时效要求和预算选择物流方式。数据为参考价格，实际以物流商报价为准。":
    "Choose shipping based on package weight, speed, and budget. Prices are estimates; confirm with the carrier.",

  // 客服场景
  "其他场景": "Other",
  "物流延迟/未到货": "Shipping delay / not delivered",
  "商品质量问题": "Product quality issue",
  "发货前改地址": "Change address before shipping",
  "发票问题": "Invoice issue",
  "差评威胁要补偿": "Negative review demanding compensation",
  "买家要求退款/退货": "Buyer requests refund / return",
  "库存不足": "Out of stock",

  // 提示词库分类
  "Listing优化": "Listing Optimization",
  "客服沟通": "Customer Communication",
  "广告运营": "Advertising",
  "选品调研": "Product Research",

  // 表单提示
  "SKU编码：": "SKU: ",
  "买家：": "Buyer: ",
  "供应商：": "Supplier: ",
  "供应商名称：": "Supplier name: ",
  "联系人：": "Contact: ",
  "电话：": "Phone: ",
  "地址：": "Address: ",
  "主营产品：": "Main products: ",
  "商品名称：": "Product name: ",
  "数量：": "Qty: ",
  "单价：": "Unit price: ",
  "仓库：": "Warehouse: ",
  "安全库存：": "Safety stock: ",
  "平台：": "Platform: ",
  "平台（如：淘宝/Amazon）：": "Platform (e.g. Taobao/Amazon): ",
  "备注：": "Notes: ",
  "关联订单号：": "Related order: ",
  "售后原因：": "After-sales reason: ",
  "退款金额：": "Refund amount: ",
  "物流单号：": "Tracking no.: ",
  "售价（元）：": "Price: ",
  "采购成本（元）：": "Purchase cost: ",
  "如：Portable Bluetooth Speaker Waterproof IPX7 Wireless Speakers 20H Playtime": "e.g.: Portable Bluetooth Speaker Waterproof IPX7 Wireless Speakers 20H Playtime",  "✅ 合规检查清单": "✅ Compliance Checklist",  "搜索提示词...": "Search prompts...",  "配置：": "Setup: ",  "引擎：": "Engine: ",  "GPU：": "GPU: ",  "淘宝": "Taobao",
  "天猫": "Tmall",
  "拼多多": "Pinduoduo",
  "抖音电商": "Douyin E-commerce",
  "快手电商": "Kuaishou E-commerce",
  "京东": "JD",
  "小红书": "Xiaohongshu",
  "预估采购成本": "Estimated Purchase Cost",
  "填写左侧信息，点击\"AI深度分析\"": "Fill in the information on the left, then click \"In-depth AI Analysis\"",
  "🔍 AI拆解竞品": "🔍 AI Competitor Breakdown",
  "输入竞品信息，AI将拆解Listing、弱点和超越策略": "Enter competitor information and the AI will break down its listing, weaknesses, and a strategy to surpass it.",
  "粘贴竞品评论（多条用空行分隔）": "Paste competitor reviews (separate multiple reviews with blank lines)",
  "粘贴评论，AI帮你找出用户真正的抱怨和机会": "Paste reviews and the AI will identify what buyers really complain about and where the opportunities are.",
  "AI将生成标题、五点描述、搜索词和主图建议": "The AI will generate a title, bullet points, search terms, and main-image suggestions.",
  "选择场景并描述情况，AI生成专业客服回复": "Choose a scenario and describe the situation; the AI will write a professional support reply.",
  "粘贴你的商品标题": "Paste your product title",
  "粘贴标题，AI检查关键词覆盖并给出优化建议": "Paste a title and the AI will check keyword coverage and suggest improvements.",
  "如：便携蓝牙音箱 / 瑜伽垫 / 宠物自动喂食器": "e.g. portable Bluetooth speaker / yoga mat / automatic pet feeder",
  "元": "yuan",
  "粘贴竞品标题或链接": "Paste a competitor title or link",
  "如：售价$29.99，主图强调防水，差评说续航短、充电慢": "e.g. price $29.99, main image highlights waterproofing, reviews mention short battery life and slow charging",
  "如：蓝牙耳机": "e.g. Bluetooth earbuds",
  "示例：\n耳机续航太短了，充一次电用2小时就没电\n\n音质不错，但戴着不舒服，夹头\n\n连接很稳定，性价比高": "Example:\nThe earbuds battery is too short - it dies after 2 hours on one charge.\n\nSound quality is good, but they're uncomfortable and clamp the head.\n\nConnection is stable and good value for money.",
  "如：便携蓝牙音箱，IPX7防水，20小时续航，TWS配对": "e.g. portable Bluetooth speaker, IPX7 waterproof, 20h battery, TWS pairing",
  "如：户外爱好者，主打小体积大音量": "e.g. outdoor enthusiasts, compact size with big sound",
  "描述买家的具体问题，如：买家说3天没收到货，要退款还要给差评": "Describe the buyer's specific issue, e.g. the buyer says they haven't received it after 3 days and wants a refund while threatening a negative review",
  "如：户外音箱、迷你音响": "e.g. outdoor speaker, mini speaker",
  "头程¥30-50/kg + 仓储+尾程": "First-mile ¥30-50/kg + storage + last-mile",
  "按平台报价": "Per-platform rates",
  "¥3-5/单": "¥3-5/order",
  "¥12-23/单": "¥12-23/order",
  "¥8-15/单": "¥8-15/order",
  "¥2-4/单": "¥2-4/order",
  "国内电商平台": "Domestic E-commerce Platforms",
  "国内C2C": "Domestic C2C",
  "国内B2C": "Domestic B2C",
  "国内社交电商": "Domestic Social Commerce",
  "国内内容电商": "Domestic Content Commerce",
  "国内种草电商": "Domestic Discovery Commerce",
  "跨境电商平台": "Cross-border E-commerce Platforms",
  "跨境B2C": "Cross-border B2C",
  "跨境社交电商": "Cross-border Social Commerce",
  "跨境内容电商": "Cross-border Content Commerce",
  "跨境独立站": "Cross-border Independent Sites (DTC)",
  "跨境拍卖电商": "Cross-border Auction Commerce",
  "跨境B2B2C": "Cross-border B2B2C",
  "✅ 合规清单": "✅ Compliance Checklist",
  "引擎：内置助手": "Engine: Built-in Assistant",
  "总显存": "Total VRAM ",
  "可用": "Available ",
  "本地运行，无需联网，隐私安全": "Runs locally, offline, private and secure",
  "盈脉": "YingMai",
  "电商工作台": "Workbench",
  "想快速了解工作台如何运转？可以加载一套示例数据，体验从采购、库存到订单、售后的完整流程。这些数据可随时一键清除，不会影响你的真实数据。": "Want a quick look at how the workbench works? Load a sample dataset to walk through the full flow from purchasing and inventory to orders and after-sales. You can clear it at any time without affecting your real data.",
  "本地AI推理 · 数据隐私安全 · 支持国内+跨境全平台": "Local AI inference · Private and secure · Supports all domestic and cross-border platforms",
  "模型：": "Model: ",
};

// 最长匹配替换
function _translateText(text) {
  if (!/[\u4e00-\u9fff]/.test(text)) return text;
  // 精确命中
  if (PHRASES[text.trim()] !== undefined && text.trim() === text) return PHRASES[text];
  let out = text;
  const keys = Object.keys(PHRASES).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (out.indexOf(k) !== -1) out = out.split(k).join(PHRASES[k]);
  }
  return out;
}

function tr(text) {
  if (currentLang !== "en") return text;
  return _translateText(String(text));
}

// 可逆翻译：用 WeakMap 保存原文
const _origText = new WeakMap();
const _origAttr = new WeakMap();

function _inI18n(node) {
  let el = node.nodeType === 3 ? node.parentElement : node;
  while (el && el !== document.body) {
    if (el.hasAttribute && el.hasAttribute("data-i18n")) return true;
    el = el.parentElement;
  }
  return false;
}

function _applyTranslate(root) {
  if (!root) return;
  const scope = root.nodeType === 3 ? root.parentElement : root;
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
  const targets = [];
  let n;
  while ((n = walker.nextNode())) {
    if (n.nodeValue && /[一-鿿]/.test(n.nodeValue) && !_inI18n(n)) targets.push(n);
  }
  targets.forEach((node) => {
    if (!_origText.has(node)) _origText.set(node, node.nodeValue);
    node.nodeValue = _translateText(node.nodeValue);
  });
  // 属性
  scope.querySelectorAll?.("[placeholder],[title],[alt]").forEach((el) => {
    ["placeholder", "title", "alt"].forEach((attr) => {
      const v = el.getAttribute(attr);
      if (v && /[一-鿿]/.test(v)) {
        if (!_origAttr.has(el)) _origAttr.set(el, {});
        if (_origAttr.get(el)[attr] === undefined) _origAttr.get(el)[attr] = v;
        el.setAttribute(attr, _translateText(v));
      }
    });
  });
}

function _restoreAll(root) {
  if (!root) return;
  const scope = root.nodeType === 3 ? root.parentElement : root;
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
  const targets = [];
  let n;
  while ((n = walker.nextNode())) {
    if (_origText.has(n)) targets.push(n);
  }
  targets.forEach((node) => {
    node.nodeValue = _origText.get(node);
  });
  scope.querySelectorAll?.("[placeholder],[title],[alt]").forEach((el) => {
    const saved = _origAttr.get(el);
    if (saved)
      ["placeholder", "title", "alt"].forEach((attr) => {
        if (saved[attr] !== undefined) el.setAttribute(attr, saved[attr]);
      });
  });
}

window._applyTranslate = _applyTranslate;
window._restoreAll = _restoreAll;

// 动态内容自动翻译（语言为英文时）
document.addEventListener("DOMContentLoaded", () => {
  const obs = new MutationObserver((mutations) => {
    if (typeof currentLang === "undefined" || currentLang !== "en") return;
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType === 1) _applyTranslate(node);
        else if (node.nodeType === 3 && /[一-鿿]/.test(node.nodeValue || "")) {
          if (!_origText.has(node)) _origText.set(node, node.nodeValue);
          node.nodeValue = _translateText(node.nodeValue);
        }
      });
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
});
