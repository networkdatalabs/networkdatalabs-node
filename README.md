# networkdatalabs

Official Node.js / TypeScript client for the [Network Data Labs](https://www.networkdatalabs.com) IP geolocation API. Zero dependencies, uses the built-in `fetch` (Node 18+, Deno, Bun, Cloudflare Workers).

```bash
npm install networkdatalabs
```

```ts
import { NetworkDataLabs } from "networkdatalabs";

const ndl = new NetworkDataLabs({ apiKey: process.env.NDL_API_KEY });

const r = await ndl.lookup("8.8.8.8");
console.log(r.location.country_code, r.location.city, r.network.asn); // US Mountain View 15169

const mine = await ndl.lookup();      // the caller's own IP
const me = await ndl.me();            // plan, usage and limits
const batch = await ndl.bulk(["8.8.8.8", "1.1.1.1"]); // up to 100 IPs, paid plans
```

Errors throw `NetworkDataLabsError` with `status` and `code` (for example `429` / `QUOTA_EXCEEDED`).

## Plans

Free: 1,000 requests/month, 1 request/second, geolocation + ASN, personal and non-commercial use. Paid plans add bulk, commercial use and risk flags (`is_tor`, `is_vpn` for known VPN networks, `is_relay` for privacy relay, `is_proxy`, `is_hosting`); on Free those fields are omitted. See [pricing](https://www.networkdatalabs.com/pricing) and the [docs](https://www.networkdatalabs.com/docs).

Get a free key: <https://www.networkdatalabs.com/dashboard/?mode=signup>

## Links

- Homepage: <https://www.networkdatalabs.com>
- Docs: <https://www.networkdatalabs.com/docs>
- Source: <https://github.com/networkdatalabs/networkdatalabs-node>
- Issues: <https://github.com/networkdatalabs/networkdatalabs-node/issues>

## License

MIT
