addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  try {
    const url = new URL(request.url)
    let subUrl = url.searchParams.get('sub')
    let bwUrl = url.searchParams.get('bw')
    let configUrl = url.searchParams.get('config') // 配置文件链接

    // 验证必需参数
    if (!subUrl) {
      return new Response(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>It Works!</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      text-align: center;
      color: white;
    }
    h1 {
      font-size: 3em;
      margin: 0;
      font-weight: 300;
    }
    p {
      font-size: 1.2em;
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>✓ It Works!</h1>
    <p>Service is running</p>
  </div>
</body>
</html>`, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8'
        }
      })
    }

    // 如果没有提供 bw 参数，尝试从 sub 参数推算
    if (!bwUrl) {
      const result = inferBandwidthUrl(subUrl, url)
      if (result) {
        bwUrl = result.bwUrl
        // 如果重建了完整的订阅URL，使用它
        if (result.fullSubUrl) {
          subUrl = result.fullSubUrl
        }
      } else {
        return new Response('无法从订阅链接推算流量查询链接，请提供 bw 参数', { status: 400 })
      }
    }

    // 自动添加 usedomains=1 参数（除非显式指定为 0 或已存在）
    subUrl = ensureUseDomains(subUrl)

    // 获取流量信息
    const bwData = await fetchBandwidthData(bwUrl)
    
    // 获取原始订阅内容
    const rawContent = await fetchSubscription(subUrl)
    
    // 获取配置文件
    const config = await fetchConfig(configUrl)
    
    // 解析并转换为 Clash 格式
    const clashConfig = await parseAndConvertToClash(rawContent, config)
    
    // 计算流量信息
    const userInfo = generateUserInfo(bwData)
    
    // 返回 Clash 配置
    return new Response(clashConfig, {
      status: 200,
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8',
        'Subscription-Userinfo': userInfo,
        'Profile-Update-Interval': '24',
        'Profile-Title': 'JustMySocks',
        'Content-Disposition': 'attachment; filename=JustMySocks.yaml'
      }
    })
  } catch (error) {
    return new Response(`错误: ${error.message}`, { status: 500 })
  }
}

// 确保订阅链接包含 usedomains=1 参数
function ensureUseDomains(subUrl) {
  try {
    const url = new URL(subUrl)
    const usedomains = url.searchParams.get('usedomains')
    
    // 如果没有 usedomains 参数，或者值不是 '0'，则添加/更新为 1
    if (usedomains === null) {
      url.searchParams.set('usedomains', '1')
    } else if (usedomains !== '0') {
      // 如果已经有但不是 0，确保是 1
      url.searchParams.set('usedomains', '1')
    }
    // 如果是 '0'，保持不变
    
    return url.toString()
  } catch (e) {
    // 如果不是有效的 URL，直接返回原始值
    return subUrl
  }
}

// 从订阅链接推算流量查询链接
function inferBandwidthUrl(subUrl, outerUrl) {
  try {
    const url = new URL(subUrl)
    
    // 检查是否是 JMS 订阅链接
    if (!url.hostname.includes('jmssub.net') && !url.hostname.includes('justmysocks')) {
      return null
    }
    
    // 提取 service 和 id 参数
    let service = url.searchParams.get('service')
    let id = url.searchParams.get('id')
    
    // 如果从 subUrl 中获取失败，尝试从外层 URL 获取
    // 这是为了处理 URL 参数未正确编码的情况
    let needRebuild = false
    if ((!service || !id) && outerUrl) {
      if (!service) {
        service = outerUrl.searchParams.get('service')
        needRebuild = true
      }
      if (!id) {
        id = outerUrl.searchParams.get('id')
        needRebuild = true
      }
    }
    
    if (!service || !id) {
      return null
    }
    
    // 构建流量查询链接
    const bwUrl = `https://justmysocks.net/members/getbwcounter.php?service=${service}&id=${id}`
    
    // 如果需要，重建完整的订阅URL
    let fullSubUrl = null
    if (needRebuild) {
      // 重建完整的订阅URL，包含所有必要参数
      const rebuiltUrl = new URL(subUrl)
      rebuiltUrl.searchParams.set('service', service)
      rebuiltUrl.searchParams.set('id', id)
      fullSubUrl = rebuiltUrl.toString()
    }
    
    return { bwUrl, fullSubUrl }
  } catch (error) {
    return null
  }
}

// 获取流量数据
async function fetchBandwidthData(bwUrl) {
  const response = await fetch(bwUrl)
  if (!response.ok) {
    throw new Error('无法获取流量信息')
  }
  return await response.json()
}

// 获取订阅内容
async function fetchSubscription(subUrl) {
  const response = await fetch(subUrl)
  if (!response.ok) {
    throw new Error('无法获取订阅内容')
  }
  return await response.text()
}

// 获取配置（使用内置ACL4SSR规则）
async function fetchConfig(configUrl) {
  // 直接返回内置配置
  return getBuiltinConfig()
}

// 获取内置配置（基于ACL4SSR规则）
function getBuiltinConfig() {
  return {
    custom_proxy_group: [
      { name: 'PROXY', type: 'url-test', rule: ['.*'], url: 'http://www.gstatic.com/generate_204', interval: 300, tolerance: 150, timeout: 50 },
      { name: 'MEDIA', type: 'fallback', rule: ['.*\\[M\\].*', '[]PROXY'], url: 'http://www.gstatic.com/generate_204', interval: 300, tolerance: 150, timeout: 50 },
      { name: 'OTHER', type: 'select', rule: ['[]PROXY', '[]DIRECT'] }
    ],
    ruleset: [
      // 直连规则
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/LocalAreaNetwork.yaml', group: 'DIRECT' },
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/UnBan.yaml', group: 'DIRECT' },
      // Steam 登录直连（必须前置）
      { rule: 'DOMAIN-SUFFIX,cm.steampowered.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,steamserver.net', group: 'DIRECT' },
      // 广告拦截
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/BanAD.yaml', group: 'REJECT' },
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/BanProgramAD.yaml', group: 'REJECT' },
      { url: 'https://raw.githubusercontent.com/TG-Twilight/AWAvenue-Ads-Rule/refs/heads/main/Filters/AWAvenue-Ads-Rule-Clash.yaml', group: 'REJECT', behavior: 'domain' },
      // Google 服务
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/GoogleFCM.yaml', group: 'PROXY' },
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/GoogleCN.yaml', group: 'DIRECT' },
      // 游戏平台
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/SteamCN.yaml', group: 'DIRECT' },
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/Epic.yaml', group: 'MEDIA' },
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/Origin.yaml', group: 'MEDIA' },
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/Sony.yaml', group: 'PROXY' },
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/Steam.yaml', group: 'MEDIA' },
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/Nintendo.yaml', group: 'PROXY' },
      // 微软服务
      { url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Bing/Bing.yaml', group: 'PROXY' },
      { url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/OneDrive/OneDrive.yaml', group: 'PROXY' },
      { url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Microsoft/Microsoft.yaml', group: 'PROXY' },
      // Apple
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Apple.yaml', group: 'PROXY' },
      // 社交通讯
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Telegram.yaml', group: 'MEDIA' },
      // AI 服务
      { url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/OpenAI/OpenAI.yaml', group: 'PROXY' },
      { url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Copilot/Copilot.yaml', group: 'PROXY' },
      { url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Claude/Claude.yaml', group: 'PROXY' },
      { url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Gemini/Gemini.yaml', group: 'PROXY' },
      // 国内媒体
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/NetEaseMusic.yaml', group: 'DIRECT' },
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/BilibiliHMT.yaml', group: 'DIRECT' },
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/Bilibili.yaml', group: 'DIRECT' },
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/ChinaMedia.yaml', group: 'DIRECT' },
      // 海外媒体
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/YouTube.yaml', group: 'MEDIA' },
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/Netflix.yaml', group: 'MEDIA' },
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/Bahamut.yaml', group: 'PROXY' },
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/ProxyMedia.yaml', group: 'MEDIA' },
      { url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Emby/Emby.yaml', group: 'MEDIA' },
      // 代理规则
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/ProxyGFWlist.yaml', group: 'PROXY' },
      { url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Proxy/Proxy.yaml', group: 'PROXY' },
      // 国内直连
      { url: 'https://raw.githubusercontent.com/UlinoyaPed/ShellClash/dev/lists/direct.list', group: 'DIRECT' },
      { url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Direct/Direct.yaml', group: 'DIRECT' },
      // 学术资源直连（仅国际资源，.cn已由GEOIP覆盖）
      { rule: 'DOMAIN-SUFFIX,cnki.net', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,duxiu.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,cqvip.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,acm.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,acs.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,aip.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,ams.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,annualreviews.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,aps.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,ascelibrary.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,asm.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,asme.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,astm.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,bmj.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,cambridge.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,cas.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,clarivate.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,ebscohost.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,emerald.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,engineeringvillage.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,icevirtuallibrary.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,ieee.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,imf.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,iop.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,jamanetwork.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,jhu.edu', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,jstor.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,karger.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,libguides.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,madsrevolution.net', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,mpg.de', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,myilibrary.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,nature.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,oecd-ilibrary.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,osapublishing.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,oup.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,ovid.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,oxfordartonline.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,oxfordbibliographies.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,oxfordmusiconline.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,pnas.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,proquest.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,rsc.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,sagepub.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,sciencedirect.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,sciencemag.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,scopus.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,siam.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,spiedigitallibrary.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,springer.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,springerlink.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,tandfonline.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,un.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,uni-bielefeld.de', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,webofknowledge.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,westlaw.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,wiley.com', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,worldbank.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,worldscientific.com', group: 'DIRECT' },
      // 其他直连域名
      { rule: 'DOMAIN-SUFFIX,lmstudio.ai', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,quickconnect.to', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,myds.me', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,newszzx.net', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,hachimichi.dpdns.org', group: 'DIRECT' },
      { rule: 'DOMAIN-SUFFIX,hachimi.us.kg', group: 'DIRECT' },
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/ChinaDomain.yaml', group: 'DIRECT' },
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/ChinaCompanyIp.yaml', group: 'DIRECT' },
      { url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Download.yaml', group: 'DIRECT' },
      { rule: 'GEOIP,CN', group: 'DIRECT' },
      // CF 优选/订阅检查工具直连
      { rule: 'PROCESS-NAME,cfnat', group: 'DIRECT' },
      { rule: 'PROCESS-NAME,colo', group: 'DIRECT' },
      { rule: 'PROCESS-NAME,subs-check.exe', group: 'DIRECT' },
      // 兜底
      { rule: 'MATCH', group: 'OTHER' }
    ]
  }
}

// 解析并转换为 Clash 格式
async function parseAndConvertToClash(rawContent, config) {
  // 尝试 Base64 解码
  let decodedContent
  try {
    decodedContent = atob(rawContent.trim())
  } catch (e) {
    // 如果不是 Base64，直接使用原始内容
    decodedContent = rawContent
  }
  
  // 按行分割节点
  const lines = decodedContent.split('\n').filter(line => line.trim())
  
  // 解析节点
  const proxies = []
  const nodeNames = []
  const errors = []
  
  for (const line of lines) {
    const proxy = parseProxy(line.trim())
    if (proxy) {
      proxies.push(proxy)
      nodeNames.push(proxy.name)
    } else if (line.trim()) {
      // 记录无法解析的行（用于调试）
      errors.push(line.substring(0, 50))
    }
  }
  
  if (proxies.length === 0) {
    throw new Error(`未能解析出任何节点。共 ${lines.length} 行，解析失败示例: ${errors.slice(0, 2).join(', ')}`)
  }
  
  // 生成 Clash 配置
  return generateClashConfig(proxies, nodeNames, config)
}

// 解析单个代理节点
function parseProxy(line) {
  if (line.startsWith('ss://')) {
    return parseShadowsocks(line)
  } else if (line.startsWith('vmess://')) {
    return parseVmess(line)
  } else if (line.startsWith('trojan://')) {
    return parseTrojan(line)
  }
  return null
}

// 解析 Shadowsocks 节点
function parseShadowsocks(uri) {
  try {
    // 处理不同的 SS 格式
    // 格式1: ss://base64(method:password@server:port)#name
    // 格式2: ss://base64(method:password)@server:port#name
    
    let decoded, server, port, method, password, name
    
    // 提取 fragment (名称)
    const hashIndex = uri.indexOf('#')
    const mainPart = hashIndex > 0 ? uri.substring(0, hashIndex) : uri
    name = hashIndex > 0 ? decodeURIComponent(uri.substring(hashIndex + 1)) : ''
    
    // 移除 ss:// 前缀
    const content = mainPart.substring(5)
    
    // 检查是否有 @ 符号（区分两种格式）
    const atIndex = content.lastIndexOf('@')
    
    if (atIndex > 0) {
      // 格式2: ss://base64(method:password)@server:port
      const serverInfo = content.substring(atIndex + 1)
      const encodedAuth = content.substring(0, atIndex)
      
      try {
        decoded = atob(encodedAuth)
        const parts = decoded.split(':')
        method = parts[0]
        password = parts.slice(1).join(':')
      } catch (e) {
        // 可能不是 base64，尝试直接解析
        const parts = encodedAuth.split(':')
        method = parts[0]
        password = parts.slice(1).join(':')
      }
      
      const serverParts = serverInfo.split(':')
      server = serverParts[0]
      port = parseInt(serverParts[1]) || 443
    } else {
      // 格式1: ss://base64(method:password@server:port)
      try {
        decoded = atob(content)
        const atIdx = decoded.lastIndexOf('@')
        const authPart = decoded.substring(0, atIdx)
        const serverPart = decoded.substring(atIdx + 1)
        
        const authParts = authPart.split(':')
        method = authParts[0]
        password = authParts.slice(1).join(':')
        
        const serverParts = serverPart.split(':')
        server = serverParts[0]
        port = parseInt(serverParts[1]) || 443
      } catch (e) {
        return null
      }
    }
    
    if (!server || !method || !password) {
      return null
    }
    
    const finalName = name || `${server}:${port}`
    const renamedName = renameNode(finalName)
    
    return {
      name: renamedName,
      type: 'ss',
      server: server,
      port: port,
      cipher: method,
      password: password,
      udp: true
    }
  } catch (e) {
    return null
  }
}

// 解析 VMess 节点
function parseVmess(uri) {
  try {
    const base64Content = uri.substring(8) // 移除 "vmess://"
    const decoded = atob(base64Content)
    const config = JSON.parse(decoded)
    
    const name = config.ps || config.remarks || `${config.add}:${config.port}`
    const renamedName = renameNode(name)
    
    return {
      name: renamedName,
      type: 'vmess',
      server: config.add,
      port: parseInt(config.port),
      uuid: config.id,
      alterId: parseInt(config.aid) || 0,
      cipher: config.scy || 'auto',
      udp: true,
      tls: config.tls === 'tls' || config.tls === true,
      'skip-cert-verify': true,
      network: config.net || 'tcp',
      ...(config.host && { 'ws-opts': { headers: { Host: config.host } } }),
      ...(config.path && { 'ws-opts': { ...({ path: config.path }) } })
    }
  } catch (e) {
    return null
  }
}

// 解析 Trojan 节点
function parseTrojan(uri) {
  try {
    const url = new URL(uri)
    const name = decodeURIComponent(url.hash.substring(1)) || `${url.hostname}:${url.port}`
    const renamedName = renameNode(name)
    
    return {
      name: renamedName,
      type: 'trojan',
      server: url.hostname,
      port: parseInt(url.port) || 443,
      password: url.username,
      udp: true,
      'skip-cert-verify': true,
      sni: url.searchParams.get('sni') || url.hostname
    }
  } catch (e) {
    return null
  }
}

// 重命名节点
function renameNode(originalName) {
  const nodeMapping = {
    's1': 'JMS-1 CN2 GT',
    's2': 'JMS-2 CN2 GT',
    's3': 'JMS-3 CN2 GIA',
    's4': 'JMS-4 SoftBank POP',
    's5': 'JMS-5 NLD POP',
    's801': 'JMS-801 [M]'
  }
  
  // 检查是否包含特定标识
  for (const [key, newName] of Object.entries(nodeMapping)) {
    if (originalName.toLowerCase().includes(key.toLowerCase())) {
      return newName
    }
  }
  
  return originalName
}

// 生成 Clash 配置
function generateClashConfig(proxies, nodeNames, customConfig) {
  // 构建代理组
  const proxyGroups = []
  
  for (const group of customConfig.custom_proxy_group) {
    const proxyGroup = {
      name: group.name,
      type: group.type
    }
    
    // 匹配节点
    const groupProxies = []
    for (const rule of group.rule) {
      if (rule === 'DIRECT' || rule === 'REJECT') {
        groupProxies.push(rule)
      } else if (rule.startsWith('[]')) {
        // 引用其他策略组，去掉 [] 前缀
        groupProxies.push(rule.substring(2))
      } else if (customConfig.custom_proxy_group.some(g => g.name === rule)) {
        // 引用其他策略组
        groupProxies.push(rule)
      } else {
        // 正则匹配节点
        try {
          const regex = new RegExp(rule)
          const matchedNodes = nodeNames.filter(name => regex.test(name))
          groupProxies.push(...matchedNodes)
        } catch (e) {
          // 如果不是有效的正则，尝试直接匹配
          if (nodeNames.includes(rule)) {
            groupProxies.push(rule)
          }
        }
      }
    }
    
    // 去重
    proxyGroup.proxies = [...new Set(groupProxies)]
    
    // 添加url-test特定参数
    if (group.type === 'url-test' || group.type === 'fallback' || group.type === 'load-balance') {
      proxyGroup.url = group.url || 'http://www.gstatic.com/generate_204'
      proxyGroup.interval = group.interval || 300
      if (group.tolerance) proxyGroup.tolerance = group.tolerance
      if (group.timeout) proxyGroup.timeout = group.timeout
    }
    
    proxyGroups.push(proxyGroup)
  }
  
  // 构建规则
  const rules = []
  for (const ruleItem of customConfig.ruleset) {
    if (ruleItem.url) {
      // 如果有URL，添加RULE-SET类型的规则引用
      rules.push({ type: 'RULE-SET', url: ruleItem.url, policy: ruleItem.group, behavior: ruleItem.behavior })
    } else if (ruleItem.rule) {
      // 直接规则
      if (ruleItem.rule === 'MATCH') {
        rules.push(`MATCH,${ruleItem.group}`)
      } else {
        rules.push(`${ruleItem.rule},${ruleItem.group}`)
      }
    }
  }
  
  const config = {
    port: 7890,
    'socks-port': 7891,
    'allow-lan': false,
    mode: 'Rule',
    'log-level': 'info',
    'external-controller': '127.0.0.1:9090',
    tun: {
      enable: false
    },
    dns: {
      enable: false,
      listen: '127.0.0.1:1053',
      ipv6: true,
      'enhanced-mode': 'fake-ip',
      'fake-ip-range': '198.18.0.1/16',
      'fake-ip-filter': [
        '*.lan',
        '*.local',
        '*.localhost',
        '*.localdomain',
        '*.home',
        'localhost.ptlogin2.qq.com',
        'localhost.sec.qq.com',
        'router.*',
        'nas.*',
        '+.srv.nintendo.net',
        '+.stun.playstation.net',
        'xbox.*.microsoft.com',
        '*.xboxlive.com',
        '*.msftncsi.com',
        '*.msftconnecttest.com',
        'time.*.com',
        'ntp.*.com',
        '*.ntp.org',
        'time*.google.com',
        '+.ntp.org.cn',
        'time.*.apple.com',
        '+.pool.ntp.org',
        '+.market.xiaomi.com',
        '+.pku.edu.cn',
        '+.edu.cn',
        '*.pku.edu.cn',
        '+.home.arpa',
        '+.ipv6.microsoft.com'
      ],
      'default-nameserver': [
        '223.5.5.5',
        '119.29.29.29'
      ],
      nameserver: [
        'https://doh.pub/dns-query',
        'https://dns.alidns.com/dns-query',
        '223.5.5.5'
      ],
      'nameserver-policy': {
        '+.pku.edu.cn': '162.105.129.88',
        '+.edu.cn': '162.105.129.88',
        'geosite:cn': '223.5.5.5'
      },
      'proxy-server-nameserver': [
        'https://doh.pub/dns-query',
        'https://dns.alidns.com/dns-query',
        '223.5.5.5'
      ],
      'direct-nameserver': [
        '223.5.5.5',
        '119.29.29.29'
      ],
      'use-hosts': true,
      'use-system-hosts': true,
      'respect-rules': true
    },
    proxies: proxies,
    'proxy-groups': proxyGroups,
    'rule-providers': {},
    rules: []
  }
  
  // 处理rule-providers和rules
  for (const ruleItem of rules) {
    if (typeof ruleItem === 'object' && ruleItem.url) {
      // 生成provider名称
      const providerName = ruleItem.url.split('/').pop().replace('.list', '').replace('.yaml', '')
      config['rule-providers'][providerName] = {
        type: 'http',
        behavior: ruleItem.behavior || 'classical',
        url: ruleItem.url,
        path: `./ruleset/${providerName}.yaml`,
        interval: 86400
      }
      config.rules.push(`RULE-SET,${providerName},${ruleItem.policy}`)
    } else {
      config.rules.push(ruleItem)
    }
  }
  
  return convertToYaml(config)
}

// 将对象转换为 YAML 格式
function convertToYaml(obj, indent = 0) {
  const spaces = '  '.repeat(indent)
  let yaml = ''
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      continue
    }
    
    if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          yaml += `${spaces}  -\n`
          yaml += convertToYaml(item, indent + 2).split('\n').map(line => 
            line ? `${spaces}  ${line}` : ''
          ).join('\n')
        } else {
          const needsQuote = typeof item === 'string' && (/[:#,]/.test(item) || /^[\-\?\@\&\*!\+\.]/.test(item))
          const strValue = needsQuote ? `"${item}"` : item
          yaml += `${spaces}  - ${strValue}\n`
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      yaml += `${spaces}${key}:\n`
      yaml += convertToYaml(value, indent + 1)
    } else {
      const needsQuote = typeof value === 'string' && (/[:#]/.test(value) || /^[\-\?\@\&\*!\+\.]/.test(value))
      const strValue = needsQuote ? `"${value}"` : value
      yaml += `${spaces}${key}: ${strValue}\n`
    }
  }
  
  return yaml
}

// 生成 Subscription-Userinfo 头
function generateUserInfo(bwData) {
  const upload = 0 // JMS 不单独统计上传
  
  // JMS API 返回的是十进制字节 (1GB = 10^9 bytes)
  // 需要转换为二进制字节 (1GB = 1024^3 bytes) 以便客户端正确显示
  // 转换公式: bytes_binary = (bytes_decimal / 10^9) * 1024^3
  const download = convertDecimalToBinary(bwData.bw_counter_b)
  const total = convertDecimalToBinary(bwData.monthly_bw_limit_b)
  const expire = calculateExpireTimestamp(bwData.bw_reset_day_of_month)
  
  return `upload=${upload}; download=${download}; total=${total}; expire=${expire}`
}

// 将十进制字节（1000^3）转换为二进制字节（1024^3）
// 这样客户端显示的数值会与服务商标称的 GB 数一致
function convertDecimalToBinary(decimalBytes) {
  // 先转换为 GB（十进制）
  const gb = decimalBytes / Math.pow(1000, 3)
  // 再转换为字节（二进制）
  const binaryBytes = Math.round(gb * Math.pow(1024, 3))
  return binaryBytes
}

// 计算下次流量重置时间的时间戳
function calculateExpireTimestamp(resetDay) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-11
  const currentDay = now.getDate()
  
  let expireDate
  
  if (currentDay >= resetDay) {
    // 如果当前日期已过重置日，设置为下个月的重置日
    expireDate = new Date(currentYear, currentMonth + 1, resetDay, 0, 0, 0)
  } else {
    // 否则设置为本月的重置日
    expireDate = new Date(currentYear, currentMonth, resetDay, 0, 0, 0)
  }
  
  // 处理特殊情况：如果重置日是31号，但某些月份没有31天
  if (resetDay > 28) {
    const monthDays = new Date(expireDate.getFullYear(), expireDate.getMonth() + 1, 0).getDate()
    if (resetDay > monthDays) {
      expireDate = new Date(expireDate.getFullYear(), expireDate.getMonth() + 1, 0, 0, 0, 0)
    }
  }
  
  return Math.floor(expireDate.getTime() / 1000)
}
