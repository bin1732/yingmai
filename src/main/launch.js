// 卖前体检（上架准备）确定性引擎 · 灵感引擎工坊 · bin1732
// 输出稳定的结构化结论；会变化的平台/市场细则统一标记为“需以官方最新规则核实”，不臆造阈值。

const DOMESTIC = ['taobao', 'tmall', 'jd', 'pdd', 'douyin', 'kuaishou', 'xiaohongshu'];
const CROSS = ['amazon', 'shopee', 'tiktokshop', 'shopify', 'ebay', 'aliexpress', 'lazada'];

const L = (zh, en) => ({ zh, en });

function launchReadiness(b) {
  const applicant = b.applicant || 'individual';           // individual | sole | enterprise
  const platform = b.platform || 'taobao';
  const market = b.market || 'US';                          // US | EU | UK | JP | SEA | Other
  const category = b.category || 'general';                // general|food|cosmetics|medical|books|electronics|toys|clothing
  const brand = b.brand || 'none';                          // none | own | authorized
  const hasConformity = !!b.hasConformity;
  const containsBattery = !!b.containsBattery || category === 'battery';
  const isDomestic = DOMESTIC.includes(platform);
  const region = isDomestic ? 'CN' : market;

  const gates = [];
  const add = (key, title, status, detail, verify) =>
    gates.push({ key, title, status, detail, verify: !!verify });

  // 1) 主体资质
  let eStatus = 'pass', eDetail;
  if (isDomestic) {
    if (platform === 'tmall' && applicant === 'individual') {
      eStatus = 'block';
      eDetail = L('天猫招商以企业及品牌店铺为主，个人通常无法直接入驻；可考虑淘宝个人店，或办理营业执照后申请。',
        'Tmall mainly recruits branded enterprise stores; individuals generally cannot join directly. Consider a Taobao personal store or obtain a business license first.');
    } else if (platform === 'jd' && applicant === 'individual') {
      eStatus = 'action';
      eDetail = L('京东多数类目以企业或个体工商户为主，个人可先办理个体工商户登记，或选择支持个人开店的平台。',
        'Most JD categories require an enterprise or sole-proprietor business license. Register as a sole proprietor or choose a platform open to individuals.');
    } else if (applicant === 'individual') {
      eStatus = 'pass';
      eDetail = L('凭本人身份证即可完成个人开店实名认证；部分类目与功能仍需个体工商户或企业资质。',
        'A personal store can be opened and verified with your ID card; some categories and features still require a business license.');
    } else if (applicant === 'sole') {
      eDetail = L('个体工商户营业执照可满足多数平台入驻要求，请准备法人身份证与对公/经营者银行账户。',
        'A sole-proprietor business license meets most platform requirements; prepare the legal representative ID and the operator bank account.');
    } else {
      eDetail = L('企业营业执照可满足平台入驻要求，请准备法人身份证与对公银行账户。',
        'A company business license meets platform requirements; prepare the legal representative ID and a corporate bank account.');
    }
  } else {
    if (applicant === 'individual') {
      eStatus = platform === 'shopify' ? 'action' : 'action';
      eDetail = platform === 'shopify'
        ? L('独立站个人也可建站，但接入收款（如 PayPal/Stripe）与广告账户通常需要个体或企业主体；建议先办理个体工商户登记。',
          'Anyone can build an independent site, but payment (PayPal/Stripe) and ad accounts usually need a business entity. Registering as a sole proprietor is recommended.')
        : L('跨境平台招商多以企业或个体工商户为主，个人通常需要先办理个体工商户或企业营业执照。',
          'Cross-border platforms mainly onboard sole proprietors or companies; individuals usually need a business license first.');
    } else if (applicant === 'sole') {
      eStatus = 'pass';
      eDetail = L('个体工商户可注册多数跨境站点；请准备营业执照、法人身份证及收款账户（如第三方收款/PayPal）。',
        'Sole proprietors can register most cross-border sites; prepare the business license, legal representative ID and a payout account (e.g. third-party payout/PayPal).');
    } else {
      eStatus = 'pass';
      eDetail = L('企业资质可注册各跨境站点；请准备营业执照、法人身份证、对公账户及收款账户。',
        'A company can register all cross-border sites; prepare the business license, legal representative ID, corporate account and payout account.');
    }
  }
  add('entity', L('主体资质', 'Business entity'), eStatus, eDetail, true);

  // 2) 类目与经营许可
  let cStatus = 'pass', cDetail, cVerify = true;
  const catMap = {
    food: {
      CN: L('销售食品通常需办理食品经营许可或备案，并留存供货方资质与检验合格证明。',
        'Selling food usually requires a food business license/filing; keep supplier qualifications and inspection certificates.'),
      cross: L('食品进入海外市场多需符合目标市场食品安全要求（如美国 FDA 相关注册/合规），请提前确认。',
        'Food for overseas markets must meet local food-safety rules (e.g. US FDA registration/compliance); confirm in advance.'),
    },
    cosmetics: {
      CN: L('化妆品需符合备案/注册要求，并准备成分与检验资料。',
        'Cosmetics require filing/registration with ingredient and testing documents.'),
      cross: L('化妆品出口需符合目标市场化妆品法规（成分、标签、责任人），请提前确认。',
        'Exported cosmetics must meet local cosmetics rules (ingredients, labeling, responsible person); confirm in advance.'),
    },
    medical: {
      CN: L('医疗器械经营需取得相应许可或办理备案，门槛较高，请先确认类目与资质。',
        'Medical-device sales require a specific license/filing with a high threshold; confirm category and qualifications first.'),
      cross: L('医疗器械进入海外市场需相应注册/认证（如 FDA、CE 医疗器械），通常需要专业支持。',
        'Medical devices need local registration/certification (e.g. FDA, CE medical), usually requiring professional support.'),
    },
    books: {
      CN: L('销售图书、音像制品通常需办理出版物经营许可证。',
        'Selling books or audio-visual products usually requires a publications business license.'),
      cross: L('出版物出口需留意版权与目标市场准入要求，请提前确认。',
        'Exported publications require attention to copyright and local admission rules; confirm in advance.'),
    },
    electronics: {
      CN: L('属于强制性产品认证（3C）目录的电子产品需取得 3C 认证，请确认产品是否在目录内。',
        'Electronics in the compulsory certification (CCC) catalogue need CCC; confirm whether the product is listed.'),
      cross: L('电子产品进入海外市场通常需要符合性认证/检测（如 CE、FCC），见“目标市场认证”一项。',
        'Electronics usually need conformity certification/testing (e.g. CE, FCC); see the market conformity gate.'),
    },
    toys: {
      CN: L('玩具需符合国家玩具安全标准，部分产品需 3C 认证。',
        'Toys must meet national toy-safety standards; some need CCC certification.'),
      cross: L('儿童玩具在海外需相应安全认证（如美国 CPC、欧盟 EN71/CE），见“目标市场认证”一项。',
        "Children's toys need safety certification abroad (e.g. US CPC, EU EN71/CE); see the market conformity gate."),
    },
    clothing: {
      CN: L('普通服装一般无需专项许可；婴幼儿及儿童纺织产品有专门安全要求。',
        'Ordinary apparel generally needs no special license; infant and children textiles have specific safety requirements.'),
      cross: L('服装出口需留意纤维成分标签、儿童产品安全与阻燃要求。',
        'Exported apparel requires fiber-content labeling and attention to child-product safety and flammability rules.'),
    },
  };
  if (catMap[category]) {
    const m = catMap[category];
    cStatus = (category === 'medical') ? 'block' : 'action';
    cDetail = isDomestic ? m.CN : m.cross;
  } else {
    cStatus = 'pass'; cVerify = false;
    cDetail = L('普通类目一般无专项经营许可；上架前仍建议确认该类目是否有平台特殊要求。',
      'General categories usually have no special license; still check for any platform-specific category requirements.');
  }
  add('category', L('类目与经营许可', 'Category & permits'), cStatus, cDetail, cVerify);

  // 3) 品牌/商标
  let bStatus = 'pass', bDetail;
  if (brand === 'own') {
    bDetail = L('自有注册商标可正常使用；建议在平台完成品牌备案，以获得品牌保护与相关功能。',
      'Your own registered trademark can be used; complete the platform brand registry for protection and features.');
  } else if (brand === 'authorized') {
    bStatus = 'action';
    bDetail = L('销售他人品牌需准备并留存品牌授权书、进货凭证（发票/采购合同），并通过平台品牌审核；授权链路要完整。',
      'Selling others’ brands requires keeping brand authorization and purchase proof (invoices/contracts), and passing platform brand approval; the authorization chain must be complete.');
  } else {
    bDetail = L('无品牌（白牌）商品不得在标题、图片中使用他人商标或近似标识；上架前建议做一次商标与外观检索。',
      'No-brand (white-label) products must not use others’ trademarks or confusing marks in titles or images; run a trademark and design search before listing.');
  }
  add('brand', L('品牌与商标', 'Brand & trademark'), bStatus, bDetail, true);

  // 4) 目标市场认证/检测
  let mStatus = hasConformity ? 'pass' : 'action';
  let mDetail;
  if (hasConformity) {
    mDetail = L('已准备符合性认证/检测报告，请妥善留存证书、报告与测试记录备查。',
      'Conformity documents are ready; keep certificates, reports and test records for inspection.');
  } else if (isDomestic) {
    mDetail = L('请确认产品是否需要强制性认证（如 3C）或质量检测报告，并留存合格证明。',
      'Confirm whether the product needs compulsory certification (e.g. CCC) or a quality test report, and keep the certificates.');
  } else if (region === 'US') {
    mDetail = L('出口美国：电子产品通常需 FCC 相关合规，儿童产品需 CPC，食品/化妆品/医疗需 FDA 相关合规；请准备检测报告。',
      'To the US: electronics generally need FCC compliance, children’s products a CPC, and food/cosmetics/medical FDA compliance; prepare test reports.');
  } else if (region === 'EU') {
    mDetail = L('出口欧盟：需加贴 CE 标志、指定欧盟责任人，并符合通用产品安全（GPSR）等要求；请准备符合性声明与检测报告。',
      'To the EU: apply CE marking, appoint an EU responsible person and comply with GPSR; prepare the declaration of conformity and test reports.');
  } else if (region === 'UK') {
    mDetail = L('出口英国：请确认 UKCA/CE 适用情况，并指定英国责任人；准备符合性声明与检测报告。',
      'To the UK: confirm UKCA/CE applicability and appoint a UK responsible person; prepare the declaration and test reports.');
  } else if (region === 'JP') {
    mDetail = L('出口日本：电子产品通常需 PSE 认证，其他品类有相应标准；请提前确认。',
      'To Japan: electronics generally need PSE certification and other categories have specific standards; confirm in advance.');
  } else if (region === 'SEA') {
    mDetail = L('出口东南亚：各国有本地认证要求（如电子、化妆品），请按目标国家逐项确认。',
      'To Southeast Asia: each country has local certification requirements (e.g. electronics, cosmetics); confirm per target country.');
  } else {
    mDetail = L('请按目标市场的准入要求准备符合性认证与检测报告。',
      'Prepare conformity certification and test reports per the target market’s admission requirements.');
  }
  add('conformity', L('目标市场认证与检测', 'Market certification & testing'), mStatus, mDetail, true);

  // 5) 标签/包装/说明（要求随详情给出，作为上架时需逐项落实的标准项）
  let lStatus = 'pass';
  let lDetail = isDomestic
    ? L('请准备中文标签与合格证明，标明产品名称、厂名厂址、执行标准及必要的警示信息。',
      'Prepare Chinese labels and the quality certificate, stating product name, manufacturer name/address, executed standard and required warnings.')
    : L('请按目标市场要求准备本地语言标签，标明产地、进口商/责任人、成分与警示信息；避免遗漏说明书语言要求。',
      'Prepare local-language labels per the target market, stating origin, importer/responsible person, ingredients and warnings; include required manual languages.');
  add('labeling', L('标签、包装与说明书', 'Labeling, packaging & manuals'), lStatus, lDetail, true);

  // 6) 特殊属性与物流（电池/液体/粉末/强磁）
  let hStatus = 'pass', hDetail;
  if (containsBattery) {
    hStatus = 'action';
    hDetail = L('含电池商品通常需 UN38.3、电池安全数据表（SDS/MSDS）等资料，并通过平台危险品审核；纯电池与内置电池要求不同，请提前确认。',
      'Battery products usually need UN38.3 and a battery safety data sheet (SDS/MSDS), plus platform hazmat approval; standalone vs built-in batteries differ—confirm in advance.');
  } else if (category === 'cosmetics') {
    hStatus = 'action';
    hDetail = L('液体、膏体在部分物流渠道有限制，请确认可承运渠道与申报要求。',
      'Liquids and creams face restrictions on some shipping channels; confirm eligible channels and declaration requirements.');
  } else {
    hDetail = L('普通属性商品一般无特殊物流限制；如含强磁、粉末、液体等请另行确认。',
      'General goods usually have no special shipping limits; confirm separately for strong magnets, powders or liquids.');
  }
  add('hazmat', L('特殊属性与物流', 'Special attributes & logistics'), hStatus, hDetail, true);

  // 7) 入驻材料清单（evidence checklist）
  const docs = [];
  const pushDoc = (zh, en) => docs.push(L(zh, en));
  pushDoc(applicant === 'individual' ? '本人身份证（实名认证）' : '营业执照与法人身份证',
    applicant === 'individual' ? 'Your ID card (identity verification)' : 'Business license and legal representative ID');
  pushDoc(isDomestic ? '经营者银行账户/结算账户' : '收款账户（第三方收款或 PayPal 等）',
    isDomestic ? 'Operator/settlement bank account' : 'Payout account (third-party payout or PayPal)');
  if (brand === 'authorized') pushDoc('品牌授权书与进货凭证', 'Brand authorization letter and purchase proof');
  if (brand === 'own') pushDoc('商标注册证（品牌备案用）', 'Trademark registration certificate (for brand registry)');
  if (['food', 'cosmetics', 'medical', 'books'].includes(category)) pushDoc('类目经营许可/备案凭证', 'Category license/filing certificate');
  if (containsBattery) pushDoc('UN38.3 与电池安全数据表', 'UN38.3 and battery safety data sheet');
  if (!isDomestic) pushDoc('符合性声明与检测报告（CE/FCC 等）', 'Declaration of conformity and test reports (CE/FCC etc.)');
  pushDoc('符合要求的商品主图与详情素材', 'Compliant main images and detail content');

  // 汇总判定
  const blocks = gates.filter((g) => g.status === 'block').length;
  const actions = gates.filter((g) => g.status === 'action').length;
  let verdictKey, verdict;
  if (blocks > 0) {
    verdictKey = 'stop';
    verdict = L('存在需要先解决的硬门槛，建议先补齐资质或更换类目/平台，再备货与上架。',
      'There are hard gates to resolve first; complete the qualifications or change category/platform before stocking or listing.');
  } else if (actions > 0) {
    verdictKey = 'prepare';
    verdict = L('可以推进，但请先按清单补齐材料、认证与标签，再正式上架。',
      'You can proceed, but complete the documents, certification and labeling on the checklist before officially listing.');
  } else {
    verdictKey = 'go';
    verdict = L('未发现明显门槛；仍建议对照平台官方最新规则核对一次后上架。',
      'No obvious gates found; still cross-check the latest official platform rules before listing.');
  }

  return {
    platform, region, applicant,
    gates, docs,
    verdict_key: verdictKey, verdict,
    note: L('平台招商与目标市场准入规则会更新，本结果用于帮助你提前准备；具体请以平台及监管机构官方最新规则为准（可使用页面提供的官方链接核对）。',
      'Platform admission and market-entry rules change; this result helps you prepare early. Always confirm against the latest official platform and regulator rules (use the official links provided).'),
  };
}

module.exports = { launchReadiness };
