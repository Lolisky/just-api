# JustMySocks API Converter (Alpha)

⚠️ **ALPHA VERSION** - This project is under active development and may contain bugs. Use at your own risk.

## Overview

A Cloudflare Worker that converts JustMySocks subscription links to Clash-compatible YAML format with automatic bandwidth tracking, custom node naming, and comprehensive routing rules.

## Features

### Core Functionality
- **Automatic Protocol Conversion**: Converts SS/VMess/Trojan protocols to Clash format
- **Bandwidth Tracking**: Fetches real-time bandwidth usage from JustMySocks API
- **Decimal to Binary Conversion**: Corrects bandwidth display (500GB shows as 500GB, not 465.7GB)
- **Custom Node Naming**: Renames JMS nodes with readable labels (e.g., `JMS-3 CN2 GIA`)
- **Domain Preference**: Automatically adds `usedomains=1` parameter for domain-based routing

### Built-in Rule Sets
- **Ad Blocking**: ACL4SSR + AWAvenue Ads Rule (~900 rules)
- **Steam Optimization**: Prioritized Steam login servers for optimal gaming experience
- **Academic Resources**: Direct routing for 60+ scholarly databases (IEEE, Nature, Springer, JSTOR, etc.)
- **Media Streaming**: Optimized routing for Netflix, YouTube, Bilibili, etc.
- **AI Services**: Dedicated routing for OpenAI, Claude, Gemini, Copilot
- **CFnat Optimization**: Process-based routing for CF optimization tools

### Intelligent Routing
- Local network and private addresses → Direct
- Advertising and tracking → Reject
- International media and services → Proxy
- Chinese websites and services → Direct
- Academic journals via CARSI/CERNET → Direct
- Steam content delivery → Direct (login servers → Prioritized)

## Usage

### Basic Usage

```
https://your-worker.workers.dev/?sub=YOUR_JMS_SUBSCRIPTION_URL
```

### Advanced Usage

```
https://your-worker.workers.dev/?sub=YOUR_JMS_SUBSCRIPTION_URL&bw=YOUR_BANDWIDTH_API_URL
```

### Parameters

- `sub` (required): JustMySocks subscription URL
- `bw` (optional): Bandwidth query URL (auto-inferred if not provided)
- `config` (optional): External config URL (currently uses built-in ACL4SSR rules)

### URL Requirements

The subscription URL should be from JustMySocks domains:
- `jmssub.net`
- `justmysocks.*`

Example:
```
https://your-worker.workers.dev/?sub=https://justmysocks5.net/members/getsub.php?service=xxxxx&id=yyyyy
```

## Deployment

### Method 1: Direct Deployment (Cloudflare Dashboard)

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **Create Application** → **Create Worker**
3. Name your worker (e.g., `jms-converter`)
4. Click **Deploy**
5. Click **Edit Code**
6. Replace the default code with contents from `worker.js`
7. Click **Save and Deploy**

### Method 2: Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Clone this repository
git clone https://github.com/Lolisky/just-api.git
cd just-api

# Login to Cloudflare
wrangler login

# Deploy
wrangler deploy
```

### Method 3: GitHub Auto-Deploy (Recommended)

Connect your Cloudflare Worker to this GitHub repository for automatic updates:

1. In Cloudflare Dashboard, go to **Workers & Pages**
2. Select your worker → **Settings** → **Triggers**
3. Under **GitHub Integration**, click **Connect to GitHub**
4. Authorize Cloudflare and select `Lolisky/just-api` repository
5. Set production branch to `main`
6. Enable **Automatic Deployments**

Now any push to the `main` branch will automatically update your worker.

## Configuration

### Proxy Groups

- **PROXY**: URL-test group for general proxy traffic
- **MEDIA**: Fallback group for streaming services
- **OTHER**: Fallback option for unmatched traffic

### Default Settings

- Port: 7890
- SOCKS Port: 7891
- Mode: Rule
- Profile Update Interval: 24 hours
- Profile Title: JustMySocks

## Response Headers

- `Profile-Title`: JustMySocks
- `Subscription-Userinfo`: Bandwidth statistics (upload/download/total/expire)
- `Profile-Update-Interval`: 24 hours
- `Content-Type`: text/yaml; charset=utf-8

## Technical Details

### Bandwidth Conversion

JustMySocks API returns bandwidth in decimal bytes (1GB = 10³ bytes), while Clash clients display in binary bytes (1GB = 1024³ bytes). This worker automatically converts:

```javascript
// Conversion formula
decimal_gb = decimal_bytes / 1000³
binary_bytes = decimal_gb × 1024³
```

This ensures 500GB subscription displays as 500GB (not 465.7GB).

### Node Naming Map

| JMS ID | Display Name |
|--------|-------------|
| s1 | JMS-1 CN2 GT |
| s2 | JMS-2 CN2 GT |
| s3 | JMS-3 CN2 GIA |
| s4 | JMS-4 SoftBank POP |
| s5 | JMS-5 NZL POP |
| s801 | JMS-801 [M] |

### Supported Protocols

- Shadowsocks (ss://)
- VMess (vmess://)
- Trojan (trojan://)

## Limitations

- Only supports JustMySocks subscription links
- Built-in rules cannot be customized via API (modify `getBuiltinConfig()` function for custom rules)
- Requires Cloudflare Workers environment

## Troubleshooting

### Issue: "Cannot infer bandwidth URL"
**Solution**: Provide `bw` parameter explicitly or ensure subscription URL contains `service` and `id` parameters.

### Issue: Bandwidth shows incorrect values
**Solution**: This should be fixed by the decimal-to-binary conversion. If still incorrect, check JustMySocks API response format.

### Issue: No nodes parsed
**Solution**: Verify subscription URL is valid and returns base64-encoded proxy list.

## Contributing

This is an alpha version. Contributions, bug reports, and feature requests are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - See LICENSE file for details

## Acknowledgments

- **ACL4SSR**: Rule sets and configuration framework
- **blackmatrix7**: iOS rule scripts and comprehensive rule collections
- **AWAvenue (秋风)**: Ad blocking rules
- **JustMySocks**: VPN service provider

## Disclaimer

This project is for educational purposes only. Users are responsible for complying with local laws and JustMySocks Terms of Service.

---

**Version**: 0.1.0-alpha  
**Last Updated**: 2026-01-03  
**Status**: Alpha - Expect breaking changes
