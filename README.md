# n8n-nodes-sgpaynowqr

An n8n community node for generating Singapore **PayNow QR codes** with the [SGPayNowQR API](https://developers.sgpaynowqr.com).

Give it a UEN, mobile number or VPA, an amount and a reference. It returns the PayNow QR string and a PNG image your workflow can email, send in chat or save. The payer can't change the amount in their banking app, and the reference makes it easy to match incoming payments to orders.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

- [Installation](#installation)
- [Operations](#operations)
- [Credentials](#credentials)
- [Usage](#usage)
- [Compatibility](#compatibility)
- [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. In short: **Settings → Community Nodes → Install** and enter `n8n-nodes-sgpaynowqr`.

## Operations

**QR Code → Generate**

| Field | Notes |
| --- | --- |
| Pay To | UEN (business), Mobile Number, or VPA |
| UEN and Merchant Name | For UEN payments. Max 25 characters each. |
| Mobile Number | Singapore number starting with 8 or 9, with or without `+65` |
| VPA | For example `+6591234567#GRAB` |
| Amount (SGD) | 0.01 to 999,999.99. The payer cannot change it. |
| Reference | Optional, letters and numbers only, max 25 characters. Shown on the payment. |
| Options | Expiry (1 to 24 hours, or never; default 24 hours), QR colour, QR size (200, 300 or 400 px), whether to include the image, and the binary field name |

**Output**

- **JSON:** `qr_string`, `payment_type`, `amount`, `currency`, `reference`, `expiry`, `request_id` and `usage` (`used`, `limit`, `period`).
- **Binary:** the QR code as `paynow-<reference>.png`, in the `data` field by default.

## Credentials

1. Sign up at [developers.sgpaynowqr.com](https://developers.sgpaynowqr.com). The free plan includes 50 QR codes a month.
2. Create an API key on the [API keys page](https://developers.sgpaynowqr.com/api-keys). Keys start with `sgpn_`.
3. In n8n, create an **SGPayNowQR API** credential and paste the key.

The credential test calls `GET /api/v1/usage`, which checks the key without using your quota.

## Usage

Example workflows:

- **Order → QR → email.** Trigger on a new order (WooCommerce, Shopify, Google Sheets), set Amount to the order total and Reference to the order number. Then attach the `data` binary in a Gmail or Send Email node.
- **Chat bot.** A Telegram Trigger parses an amount, SGPayNowQR generates the QR, and Telegram **Send Photo** sends it back with binary field `data`.
- **AI Agent tool.** The node can be used as a tool, so an agent can generate a QR when asked, for example "make a $25 PayNow QR for invoice INV042".

Only successful requests count toward your monthly quota. When the quota is used up the node fails with a clear message. Turn on **Continue On Fail** if you want the workflow to carry on regardless.

## Compatibility

Built with `@n8n/node-cli` against `n8n-workflow` 2.x. It has no runtime dependencies.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [SGPayNowQR API docs](https://developers.sgpaynowqr.com/docs)
- [Using SGPayNowQR with n8n](https://developers.sgpaynowqr.com/docs/guides/n8n)
- [SGPayNowQR MCP server](https://developers.sgpaynowqr.com/docs/guides/mcp-server-setup), an alternative for AI agents through n8n's MCP Client Tool node

## License

[MIT](LICENSE.md)
