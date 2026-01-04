# JustMySocks API Converter (Alpha)

⚠️ **ALPHA VERSION** - This project is under active development and may contain bugs. Use at your own risk.

## Overview

A Cloudflare Worker that converts JustMySocks subscription links to Clash-compatible YAML format with automatic bandwidth tracking, intelligent DNS resolution, and comprehensive routing rules.

## Features

- **Multi-Protocol Support**: Converts SS/VMess/Trojan protocols to Clash format
- **Bandwidth Tracking**: Real-time bandwidth usage with accurate decimal-to-binary conversion (500GB shows as 500GB, not 465.7GB)
- **Smart DNS**: DoH-based DNS with fake-ip mode, IPv6 support, and optimized nameserver policies
- **Custom Node Naming**: Readable node labels (e.g., `JMS-3 CN2 GIA`)
- **Comprehensive Rules**: Built-in ACL4SSR rules with ad blocking, media optimization, and academic resource routing
- **Domain Preference**: Automatically enables domain-based routing for better performance

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

### Default Settings

- **HTTP Port**: 7890
- **SOCKS Port**: 7891
- **DNS Port**: 127.0.0.1:1053
- **Mode**: Rule-based routing
- **DNS Mode**: Fake-IP with DoH encryption
- **Update Interval**: 24 hours

### Proxy Groups

- **PROXY**: URL-test group for general proxy traffic
- **MEDIA**: Fallback group for streaming services  
- **OTHER**: Manual selection for unmatched traffic

## Response Headers

- `Profile-Title`: JustMySocks
- `Subscription-Userinfo`: Bandwidth statistics (upload/download/total/expire)
- `Profile-Update-Interval`: 24 hours
- `Content-Type`: text/yaml; charset=utf-8

## Technical Details

### Bandwidth Conversion
Automatically converts JustMySocks' decimal bandwidth (1GB = 10³ bytes) to binary format (1GB = 1024³ bytes) for accurate display in Clash clients.

### DNS Features
- **Fake-IP Mode**: IP range `198.18.0.1/16` with comprehensive filter rules
- **DoH Support**: Encrypted DNS queries via Alibaba DNS and DNSPod
- **Split DNS**: Dedicated nameservers for education networks, gaming services, and local networks
- **IPv6 Ready**: Full IPv6 resolution support

### Supported Protocols
- Shadowsocks (ss://)
- VMess (vmess://)
- Trojan (trojan://)

## Limitations

- Only supports JustMySocks subscription links
- Built-in rules cannot be customized via API (modify `getBuiltinConfig()` function for custom rules)
- Requires Cloudflare Workers environment

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot infer bandwidth URL" | Provide `bw` parameter or ensure subscription URL contains `service` and `id` parameters |
| Incorrect bandwidth display | Verify JustMySocks API response format (should be auto-fixed) |
| No nodes parsed | Check if subscription URL is valid and returns base64-encoded proxy list |
| DNS resolution issues | Ensure client supports Clash DNS configuration and fake-ip mode |

## Contributing
requires code modification)
- Runs exclusively on Cloudflare Workersbug reports, and feature requests are welcome!

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
- **AWAvenue  - Rule sets and routing framework
- **blackmatrix7** - Comprehensive rule collections
- **AWAvenue (秋风)** - Ad blocking rules
- **JustMySocks** -

This project is for educational purposes only. Users are responsible for complying with local laws and JustMySocks Terms of Service.

---

**Version**: 0.1.0-alpha  
**Last Updated**: 2026-01-03  
**Status**: Alpha - Expect breaking changes
4  
**Status**: Alpha - Active Development