// 联网失败路径测试 · 灵感引擎工坊 · bin1732
// 离线时自动跳过（exit 0，不报错）；联网时用明显假凭证打真实端点，断言 test() 返回 ok:false。
const assert = require('assert');
const amazon = require('../src/main/shopconn/amazon');
const ebay = require('../src/main/shopconn/ebay');
const shopee = require('../src/main/shopconn/shopee');
const aliexpress = require('../src/main/shopconn/aliexpress');
const tiktokshop = require('../src/main/shopconn/tiktokshop');
const lazada = require('../src/main/shopconn/lazada');
const c1688 = require('../src/main/shopconn/c1688');
const taobao = require('../src/main/shopconn/taobao');
const jd = require('../src/main/shopconn/jd');
const pdd = require('../src/main/shopconn/pdd');
const douyin = require('../src/main/shopconn/douyin');
const kuaishou = require('../src/main/shopconn/kuaishou');
const xiaohongshu = require('../src/main/shopconn/xiaohongshu');

function t(key) { return key; }

async function reachable(url) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=refresh_token',
    });
    clearTimeout(timer);
    void r;
    return true;
  } catch {
    return false;
  }
}

(async () => {
  const lazadaUp = await (async () => {
    // Lazada 授权主机可达性：裸 GET token/create，能连上并返回 ISV 信封即可
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch('https://auth.lazada.com/rest/auth/token/create', { signal: ctrl.signal });
      clearTimeout(timer);
      void r;
      return true;
    } catch { return false; }
  })();
  const [amzUp, ebayUp, shopeeUp, aeUp, ttUp, c1688Up, tbUp, jdUp, pddUp, dyUp, ksUp, xhsUp] = await Promise.all([
    reachable('https://api.amazon.com/auth/o2/token'),
    reachable('https://api.ebay.com/identity/v1/oauth2/token'),
    (async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const r = await fetch('https://partner.shopeemobile.com/api/v2/auth/token/get', {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        clearTimeout(timer);
        void r;
        return true;
      } catch { return false; }
    })(),
    (async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const r = await fetch('https://eco.taobao.com/router/rest', {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'method=aliexpress.postproduct.redefining.findproductinfolistquery',
        });
        clearTimeout(timer);
        void r;
        return true;
      } catch { return false; }
    })(),
    (async () => {
      // TikTok 业务 host（Open API）可达性探测：裸 GET 根路径，能连上即可
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const r = await fetch('https://open-api.tiktokglobalshop.com/', { signal: ctrl.signal });
        clearTimeout(timer);
        void r;
        return true;
      } catch { return false; }
    })(),
    (async () => {
      // 1688 AOP 网关可达性：裸 POST 一个假 appKey 路径，能连上并返回（哪怕错误信封）即视为可达
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const r = await fetch('https://gw.open.1688.com/openapi/param2/1/com.alibaba.fenxiao.crossborder/product.search.keywordQuery/INVALIDAPPKEYEXAMPLE', {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'keyword=test',
        });
        clearTimeout(timer);
        void r;
        return true;
      } catch { return false; }
    })(),
    (async () => {
      // 淘宝 TOP 网关可达性：裸 POST 一个假 method，能连上并返回（哪怕错误信封）即视为可达
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const r = await fetch('https://eco.taobao.com/router/rest', {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'method=taobao.items.onsale.get&app_key=INVALIDEXAMPLE',
        });
        clearTimeout(timer);
        void r;
        return true;
      } catch { return false; }
    })(),
    (async () => {
      // 京东宙斯网关可达性：裸 POST 假 method，能连上即视为可达
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const r = await fetch('https://api.jd.com/routerjson', {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'method=jingdong.item.list.get&app_key=INVALIDEXAMPLE',
        });
        clearTimeout(timer);
        void r;
        return true;
      } catch { return false; }
    })(),
    (async () => {
      // 拼多多 POP 网关可达性（仅 POST）：裸 POST 假 type，能连上即视为可达
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const r = await fetch('https://gw-api.pinduoduo.com/api/router', {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'type=pdd.goods.list.get&client_id=INVALIDEXAMPLE',
        });
        clearTimeout(timer);
        void r;
        return true;
      } catch { return false; }
    })(),
    (async () => {
      // 抖店网关可达性：裸 GET 假 method，能连上并返回（哪怕错误信封）即视为可达
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const r = await fetch('https://openapi-fxg.jinritemai.com/?method=order.searchList&app_key=INVALIDEXAMPLE', {
          method: 'GET',
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        void r;
        return true;
      } catch { return false; }
    })(),
    (async () => {
      // 快手电商网关可达性：裸 POST 假 method，能连上即视为可达
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const r = await fetch('https://openapi.kwaixiaodian.com/', {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'method=open.order.list&appkey=INVALIDEXAMPLE',
        });
        clearTimeout(timer);
        void r;
        return true;
      } catch { return false; }
    })(),
    (async () => {
      // 小红书 common_controller 可达性：裸 POST 假 method，能连上即视为可达
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const r = await fetch('https://ark.xiaohongshu.com/ark/open_api/v3/common_controller', {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'Content-Type': 'application/json' },
          body: '{"method":"order.list","appId":"INVALIDEXAMPLE"}',
        });
        clearTimeout(timer);
        void r;
        return true;
      } catch { return false; }
    })(),
  ]);
  if (!amzUp && !ebayUp && !shopeeUp && !aeUp && !ttUp && !c1688Up && !lazadaUp && !tbUp && !jdUp && !pddUp && !dyUp && !ksUp && !xhsUp) {
    console.log('SKIP shopconn-live（离线，自动跳过）');
    process.exit(0);
  }

  // ── Amazon：假凭证打真实 LWA 端点 ──
  if (amzUp) {
    const creds = {
      region: 'NA',
      marketplaceId: '',
      sellerId: 'A1EXAMPLESELLER',
      clientId: 'amzn1.application-oa2-client.invalid',
      clientSecret: 'INVALIDSECRET',
      refreshToken: 'Atzr|INVALIDEXAMPLE',
      awsAccessKeyId: 'AKIAINVALIDEXAMPLE',
      awsSecretAccessKey: 'InvalidSecretExample',
    };
    const ctx = { request: async () => ({ error: 'should-not-reach-signed-request' }), t };
    const res = await amazon.test(creds, ctx);
    console.log('amazon.test(假凭证) =>', JSON.stringify(res));
    assert.equal(res.ok, false, '假凭证必须返回 ok:false');
    console.log('PASS amazon 失败路径（真实 LWA 端点拒绝假凭证）');
  } else {
    console.log('SKIP amazon live（LWA 端点不可达）');
  }

  // ── eBay：假凭证打真实令牌端点 + 假 Bearer 打真实 Sell 端点 ──
  if (ebayUp) {
    // 1) 假 App ID / Cert ID / Refresh Token 换 token → 真实令牌端点应 401
    const creds = {
      env: 'production',
      marketplaceId: 'EBAY_US',
      clientId: 'INVALID-APP-ID',
      clientSecret: 'INVALID-CERT-ID',
      refreshToken: 'v^1.1#INVALIDREFRESHTOKEN',
    };
    const ctx = { request: async () => ({ error: 'should-not-reach-sell-request' }), t };
    const res = await ebay.test(creds, ctx);
    console.log('ebay.test(假凭证) =>', JSON.stringify(res));
    assert.equal(res.ok, false, '假凭证必须返回 ok:false');

    // 2) 假 Bearer 直接打真实 Sell 端点 getPrivilege → 应 401
    const basic = Buffer.from('INVALID-APP-ID:INVALID-CERT-ID').toString('base64');
    const r = await fetch('https://api.ebay.com/sell/account/v1/privilege', {
      headers: {
        'Authorization': 'Bearer INVALID-ACCESS-TOKEN',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'Accept': 'application/json',
      },
    });
    void basic;
    console.log('ebay 假 Bearer 打真实 getPrivilege => HTTP', r.status);
    assert.equal(r.status, 401, '假 Bearer 打真实 Sell 端点必须 401');
    console.log('PASS ebay 失败路径（真实令牌端点 + Sell 端点拒绝假凭证）');
  } else {
    console.log('SKIP ebay live（eBay 令牌端点不可达）');
  }

  // ── Shopee：假 Partner/Key 打真实令牌端点 + 假 Access Token 打真实 get_shop_info ──
  if (shopeeUp) {
    // 1) 假 Partner ID/Key 用假 code 换 token → 真实 token/get 端点应拒绝
    const badCreds = {
      env: 'production',
      location: 'global',
      partnerId: '1001141',
      partnerKey: 'INVALIDPARTNERKEYEXAMPLE',
      shopId: '38862',
    };
    let exchanged = false;
    try {
      await shopee.exchangeCode(badCreds, 'INVALIDCODEEXAMPLE');
      exchanged = true;
    } catch (e) {
      console.log('shopee.exchangeCode(假 code) => 被拒:', e.message);
    }
    assert.equal(exchanged, false, '假 code/Key 打真实 token/get 必须失败');

    // 2) 假 Access Token 走 buildInit 签名打真实 get_shop_info → 应 4xx → test() ok:false
    const creds = Object.assign({}, badCreds, {
      accessToken: 'INVALIDACCESSTOKENEXAMPLE',
      refreshToken: 'INVALIDREFRESHTOKENEXAMPLE',
    });
    // 用真实 requester：直接调 test()，其内部 ctx.request 会走真实签名 HTTP
    const realCtx = {
      request: async (url, init) => {
        const built = await shopee.buildInit(creds, url, init || { method: 'GET' }, { persistCredentials: async () => {} });
        const r = await fetch(built.url, { method: built.method || 'GET', headers: built.headers, body: built.body });
        return { status: r.status, json: await r.clone().json().catch(() => null) };
      },
      t,
    };
    const res = await shopee.test(creds, realCtx);
    console.log('shopee.test(假 token) =>', JSON.stringify(res));
    assert.equal(res.ok, false, '假 Access Token 打真实 get_shop_info 必须 ok:false');
    console.log('PASS shopee 失败路径（真实 token 端点拒绝假 code/Key；假 Access Token 打 get_shop_info 返回 ok:false）');
  } else {
    console.log('SKIP shopee live（Shopee 令牌端点不可达）');
  }

  // ── AliExpress：假 AppKey/Secret/Access Token 走真实签名打真实 TOP 网关 → ok:false ──
  if (aeUp) {
    const creds = {
      gateway: 'eco',
      sellerId: 'cn10001234',
      appKey: 'INVALIDAPPKEYEXAMPLE',
      appSecret: 'INVALIDSECRETEXAMPLE',
      accessToken: 'INVALIDACCESSTOKENEXAMPLE',
    };
    // 真实 ctx.request：按 callTop 给出的 form body/headers 直接 POST 真实网关
    const realCtx = {
      request: async (url, init) => {
        const r = await fetch(url, { method: init.method || 'POST', headers: init.headers, body: init.body });
        let json = null;
        try { json = await r.clone().json(); } catch { /* 非 JSON */ }
        return { status: r.status, json };
      },
      t,
    };
    const res = await aliexpress.test(creds, realCtx);
    console.log('aliexpress.test(假凭证) =>', JSON.stringify(res));
    assert.equal(res.ok, false, '假 AppKey/Secret/Token 打真实 TOP 网关必须 ok:false');
    console.log('PASS aliexpress 失败路径（真实 eco.taobao.com 网关拒绝假凭证，无假阳性）');
  } else {
    console.log('SKIP aliexpress live（TOP 网关不可达）');
  }

  // ── TikTok Shop：假 app_key/secret + 假 access_token 走真实 HMAC 签名打真实 Get Authorized Shops → ok:false ──
  if (ttUp) {
    const creds = {
      authRegion: 'row',
      appKey: 'INVALIDAPPKEYEXAMPLE',
      appSecret: 'INVALIDSECRETEXAMPLE',
      accessToken: 'INVALIDACCESSTOKENEXAMPLE',
      refreshToken: '',
      shopCipher: '',
    };
    // 真实 ctx.request：按 buildInit 给出的签名 URL/头直接打真实 Open API
    const realCtx = {
      request: async (url, init) => {
        const built = await tiktokshop.buildInit(creds, url, init || { method: 'GET' }, { persistCredentials: async () => {} });
        const r = await fetch(built.url, { method: built.method || 'GET', headers: built.headers, body: built.body });
        let json = null;
        try { json = await r.clone().json(); } catch { /* 非 JSON */ }
        return { status: r.status, json };
      },
      t,
    };
    const res = await tiktokshop.test(creds, realCtx);
    console.log('tiktokshop.test(假 app_key/secret+假 access_token) =>', JSON.stringify(res));
    assert.equal(res.ok, false, '假凭证打真实 Get Authorized Shops 必须 ok:false');
    console.log('PASS tiktokshop 失败路径（真实 open-api.tiktokglobalshop.com 拒绝假凭证，无假阳性）');
  } else {
    console.log('SKIP tiktokshop live（Open API host 不可达）');
  }

  // ── Lazada：假 app_key/secret 打真实 auth 主机；假 access_token 走真实 HMAC 签名打至少两个 region host → ok:false ──
  if (lazadaUp) {
    // 1) 假 app_key/secret + 假 code 打真实 token/create（auth 主机）→ 必须拒绝
    const badCreds = {
      country: 'sg',
      appKey: 'INVALIDAPPKEYEXAMPLE',
      appSecret: 'INVALIDSECRETEXAMPLE',
    };
    let exchanged = false;
    try {
      await lazada.exchangeCode(badCreds, 'INVALIDCODEEXAMPLE');
      exchanged = true;
    } catch (e) {
      console.log('lazada.exchangeCode(假 code) => 被拒:', e.message);
    }
    assert.equal(exchanged, false, '假 code/Key 打真实 auth.lazada.com token/create 必须失败');

    // 2) 假 access_token（accessTokenExpireAt 设远未来，避免触发刷新）走 buildInit 签名打真实 region host /shop/get
    //    HTTP200 但 JSON code 非成功 → test() 必须 ok:false（无假阳性）
    const farFuture = Math.floor(Date.now() / 1000) + 3600;
    for (const cc of ['sg', 'vn']) {
      const creds = Object.assign({}, badCreds, {
        country: cc,
        accessToken: 'INVALIDACCESSTOKENEXAMPLE',
        refreshToken: 'INVALIDREFRESHTOKENEXAMPLE',
        accessTokenExpireAt: farFuture,
        refreshTokenExpireAt: farFuture,
      });
      const realCtx = {
        request: async (url, init) => {
          const built = await lazada.buildInit(creds, url, init || { method: 'GET' }, { persistCredentials: async () => {} });
          const r = await fetch(built.url, { method: built.method || 'GET', headers: built.headers, body: built.body });
          let json = null;
          try { json = await r.clone().json(); } catch { /* 非 JSON */ }
          return { status: r.status, json };
        },
        t,
      };
      const res = await lazada.test(creds, realCtx);
      console.log(`lazada.test(假 token, ${cc} host) =>`, JSON.stringify(res));
      assert.equal(res.ok, false, `假 access_token 打真实 ${cc} region host /shop/get 必须 ok:false`);
    }
    console.log('PASS lazada 失败路径（真实 auth 主机拒绝假 code；假 access_token 打 sg/vn 两个 region host 返回 ok:false，无假阳性）');
  } else {
    console.log('SKIP lazada live（auth.lazada.com 不可达）');
  }

  // ── 1688：假 appKey/secret + 假 access_token 走真实 AOP 签名打真实 gw.open.1688.com keywordQuery → ok:false ──
  if (c1688Up) {
    const creds = {
      appKey: 'INVALIDAPPKEYEXAMPLE',
      appSecret: 'INVALIDSECRETEXAMPLE',
      accessToken: 'INVALIDACCESSTOKENEXAMPLE',
      memberId: '',
    };
    // 真实 ctx.request：按 callAop 给出的签名 form body/headers 直接 POST 真实 AOP 网关；
    // 并模拟共享层 makeRequester：401/403/>=400 一律转成 r.error，避免空响应被误判成功（防假阳性）
    const realCtx = {
      request: async (url, init) => {
        const r = await fetch(url, { method: init.method || 'POST', headers: init.headers, body: init.body });
        let json = null;
        try { json = await r.clone().json(); } catch { /* 非 JSON */ }
        if (r.status === 401 || r.status === 403) return { error: 'invalid token (http ' + r.status + ')' };
        if (r.status >= 400) return { error: 'http ' + r.status };
        return { status: r.status, json };
      },
      t,
    };
    const res = await c1688.test(creds, realCtx);
    console.log('c1688.test(假 appKey/secret+假 access_token) =>', JSON.stringify(res));
    assert.equal(res.ok, false, '假凭证打真实 gw.open.1688.com keywordQuery 必须 ok:false');
    console.log('PASS 1688 失败路径（真实 AOP 网关拒绝假凭证，无假阳性）');
  } else {
    console.log('SKIP 1688 live（gw.open.1688.com 不可达）');
  }

  // ── 淘宝/天猫：假 AppKey/Secret/Token 走真实 TOP MD5 签名打真实 eco.taobao.com → ok:false ──
  if (tbUp) {
    const creds = {
      sellerNick: '',
      appKey: 'INVALIDAPPKEYEXAMPLE',
      appSecret: 'INVALIDSECRETEXAMPLE',
      accessToken: 'INVALIDACCESSTOKENEXAMPLE',
    };
    // 真实 ctx.request：按 callTop 给出的签名 form body/headers 直接 POST 真实 TOP 网关；
    // 401/403/>=400 转成 r.error，避免空响应被误判成功（防假阳性）。
    const realCtx = {
      request: async (url, init) => {
        const r = await fetch(url, { method: init.method || 'POST', headers: init.headers, body: init.body });
        let json = null;
        try { json = await r.clone().json(); } catch { /* 非 JSON */ }
        if (r.status === 401 || r.status === 403) return { error: 'invalid token (http ' + r.status + ')' };
        if (r.status >= 400) return { error: 'http ' + r.status };
        return { status: r.status, json };
      },
      t,
    };
    const res = await taobao.test(creds, realCtx);
    console.log('taobao.test(假凭证) =>', JSON.stringify(res));
    assert.equal(res.ok, false, '假 AppKey/Secret/Token 打真实 eco.taobao.com 必须 ok:false');
    console.log('PASS taobao 失败路径（真实 TOP 网关拒绝假凭证/云外拦截，无假阳性）');
  } else {
    console.log('SKIP taobao live（eco.taobao.com 不可达）');
  }

  // ── 京东：假 AppKey/Secret/Token 走真实 JOS MD5 签名打真实 api.jd.com/routerjson → ok:false ──
  if (jdUp) {
    const creds = {
      sellerPin: '',
      appKey: 'INVALIDAPPKEYEXAMPLE',
      appSecret: 'INVALIDSECRETEXAMPLE',
      accessToken: 'INVALIDACCESSTOKENEXAMPLE',
      refreshToken: '',
    };
    const realCtx = {
      request: async (url, init) => {
        const r = await fetch(url, { method: init.method || 'POST', headers: init.headers, body: init.body });
        let json = null;
        try { json = await r.clone().json(); } catch { /* 非 JSON */ }
        if (r.status === 401 || r.status === 403) return { error: 'invalid token (http ' + r.status + ')' };
        if (r.status >= 400) return { error: 'http ' + r.status };
        return { status: r.status, json };
      },
      t,
    };
    const res = await jd.test(creds, realCtx);
    console.log('jd.test(假凭证) =>', JSON.stringify(res));
    assert.equal(res.ok, false, '假 AppKey/Secret/Token 打真实宙斯网关必须 ok:false');
    console.log('PASS jd 失败路径（真实 api.jd.com 网关拒绝假凭证/云鼎外拦截，无假阳性）');
  } else {
    console.log('SKIP jd live（api.jd.com 不可达）');
  }

  // ── 拼多多：假 client_id/secret/Token 走真实 POP MD5 签名打真实 gw-api.pinduoduo.com → ok:false ──
  if (pddUp) {
    const creds = {
      sellerName: '',
      clientId: 'INVALIDCLIENTIDEXAMPLE',
      clientSecret: 'INVALIDSECRETEXAMPLE',
      accessToken: 'INVALIDACCESSTOKENEXAMPLE',
    };
    const realCtx = {
      request: async (url, init) => {
        const r = await fetch(url, { method: init.method || 'POST', headers: init.headers, body: init.body });
        let json = null;
        try { json = await r.clone().json(); } catch { /* 非 JSON */ }
        if (r.status === 401 || r.status === 403) return { error: 'invalid token (http ' + r.status + ')' };
        if (r.status >= 400) return { error: 'http ' + r.status };
        return { status: r.status, json };
      },
      t,
    };
    const res = await pdd.test(creds, realCtx);
    console.log('pdd.test(假凭证) =>', JSON.stringify(res));
    assert.equal(res.ok, false, '假 client_id/secret/Token 打真实 gw-api.pinduoduo.com 必须 ok:false');
    console.log('PASS pdd 失败路径（真实 POP 网关拒绝假凭证/多多云外拦截，无假阳性）');
  } else {
    console.log('SKIP pdd live（gw-api.pinduoduo.com 不可达）');
  }

  // ── 抖店：假 shop_id/app_key/secret/Token 走真实 MD5 签名打真实 openapi-fxg.jinritemai.com → ok:false ──
  if (dyUp) {
    const creds = {
      shopId: '000000',
      appKey: 'INVALIDAPPKEYEXAMPLE',
      appSecret: 'INVALIDSECRETEXAMPLE',
      accessToken: 'INVALIDACCESSTOKENEXAMPLE',
    };
    const realCtx = {
      request: async (url, init) => {
        const r = await fetch(url, { method: (init && init.method) || 'GET', headers: (init && init.headers) || {}, body: (init && init.body) || undefined });
        let json = null;
        try { json = await r.clone().json(); } catch { /* 非 JSON */ }
        if (r.status === 401 || r.status === 403) return { error: 'invalid (http ' + r.status + ')' };
        if (r.status >= 400) return { error: 'http ' + r.status };
        return { status: r.status, json };
      },
      t,
    };
    const res = await douyin.test(creds, realCtx);
    console.log('douyin.test(假凭证) =>', JSON.stringify(res));
    assert.equal(res.ok, false, '假 shop_id/app_key/secret/Token 打真实抖店网关必须 ok:false');
    console.log('PASS douyin 失败路径（真实 openapi-fxg.jinritemai.com 拒绝假凭证/IP 白名单，无假阳性）');
  } else {
    console.log('SKIP douyin live（openapi-fxg.jinritemai.com 不可达）');
  }

  // ── 快手电商：假 app_id/secret/Token 走真实 HMAC-SHA256 签名打真实 openapi.kwaixiaodian.com → ok:false ──
  if (ksUp) {
    const creds = {
      appId: 'INVALIDAPPIDEXAMPLE',
      appSecret: 'INVALIDSECRETEXAMPLE',
      accessToken: 'INVALIDACCESSTOKENEXAMPLE',
    };
    const realCtx = {
      request: async (url, init) => {
        const r = await fetch(url, { method: (init && init.method) || 'POST', headers: (init && init.headers) || {}, body: (init && init.body) || undefined });
        let json = null;
        try { json = await r.clone().json(); } catch { /* 非 JSON */ }
        if (r.status === 401 || r.status === 403) return { error: 'invalid (http ' + r.status + ')' };
        if (r.status >= 400) return { error: 'http ' + r.status };
        return { status: r.status, json };
      },
      t,
    };
    const res = await kuaishou.test(creds, realCtx);
    console.log('kuaishou.test(假凭证) =>', JSON.stringify(res));
    assert.equal(res.ok, false, '假 app_id/secret/Token 打真实快手电商网关必须 ok:false');
    console.log('PASS kuaishou 失败路径（真实 openapi.kwaixiaodian.com 拒绝假凭证/资质，无假阳性）');
  } else {
    console.log('SKIP kuaishou live（openapi.kwaixiaodian.com 不可达）');
  }

  // ── 小红书千帆：假 appId/secret/Token 走真实 MD5 签名打真实 common_controller → ok:false ──
  if (xhsUp) {
    const creds = {
      shopId: '',
      appId: 'INVALIDAPPIDEXAMPLE',
      appSecret: 'INVALIDSECRETEXAMPLE',
      accessToken: 'INVALIDACCESSTOKENEXAMPLE',
    };
    const realCtx = {
      request: async (url, init) => {
        const r = await fetch(url, { method: (init && init.method) || 'POST', headers: (init && init.headers) || {}, body: (init && init.body) || undefined });
        let json = null;
        try { json = await r.clone().json(); } catch { /* 非 JSON */ }
        if (r.status === 401 || r.status === 403) return { error: 'invalid (http ' + r.status + ')' };
        if (r.status >= 400) return { error: 'http ' + r.status };
        return { status: r.status, json };
      },
      t,
    };
    const res = await xiaohongshu.test(creds, realCtx);
    console.log('xiaohongshu.test(假凭证) =>', JSON.stringify(res));
    assert.equal(res.ok, false, '假 appId/secret/Token 打真实 common_controller 必须 ok:false');
    console.log('PASS xiaohongshu 失败路径（真实 common_controller 拒绝假凭证/签名，无假阳性）');
  } else {
    console.log('SKIP xiaohongshu live（common_controller 不可达）');
  }

  console.log('\nlive 测试通过');
  process.exit(0);
})().catch((e) => {
  console.error('FAIL shopconn-live ->', e.message);
  process.exit(1);
});
