<div align="center">

# YingMai Workbench · 盈脉电商工作台

**A local-first desktop workbench for domestic and cross-border e-commerce sellers.**

[English](README.en.md) **|** [简体中文](README.md)

[![CI](https://github.com/bin1732/yingmai/actions/workflows/ci.yml/badge.svg)](https://github.com/bin1732/yingmai/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-4.6.0-brightgreen)](#)
[![License](https://img.shields.io/badge/license-GPL--3.0--only-blue)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-0078d7)](#)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-339933)](#)
[![Downloads](https://img.shields.io/github/downloads/bin1732/yingmai/total)](https://github.com/bin1732/yingmai/releases)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Highlights](#highlights)
- [Installation](#installation-windows)
- [Bundled models](#bundled-models)
- [Feature modules](#feature-modules)
- [Supported platforms](#supported-platforms)
- [AI engine](#ai-engine)
- [Voice input](#voice-input)
- [Hardware adaptation](#hardware-adaptation)
- [Data security and compliance](#data-security-and-compliance)
- [Architecture](#architecture)
- [Build from source](#build-from-source)
- [Contributing](#contributing)
- [License](#license)

## Overview

YingMai is a desktop application for people who sell on domestic and cross-border online marketplaces. It covers the day-to-day workflow—product sourcing, competitor research, listings, inventory, purchasing, orders, shipping, after-sales, customers, pricing, advertising, fees, profit, compliance, and copywriting.

The application **bundles an offline AI model and works immediately after installation**. No other tools are required and an internet connection is optional. Inference runs on the device and business data stays on the device. If you need stronger capabilities, you can connect your own cloud API key or a local model in Settings.

## Highlights

- **Ready out of the box**—double-click to install; no Ollama, LM Studio, or Python needed.
- **Offline AI assistant and offline speech-to-text** bundled with the app.
- **Store connectors** that talk directly to marketplaces using your own credentials, which are encrypted and stored only on your device.
- **Real bookkeeping**—per-order profit and loss, fee ledger, and platform reconciliation.
- **Bilingual UI** (English / 中文) with light and dark themes and a modern frosted-glass interface.

## Installation (Windows)

1. Double-click `盈脉 Setup 4.6.0.exe`.
2. Follow the prompts; you can choose the installation folder. Desktop and Start Menu shortcuts are created.
3. Double-click the **盈脉 / YingMai** shortcut to start.

> Prefer not to install? Double-click `盈脉-便携版.exe`. The first launch prepares the files (this can take around half a minute); later launches take only a second or two.
> The bundled models are included—Ollama, LM Studio, and Python are not required.

A short **user guide** appears on first launch to introduce the main features. You can skip it at any time and reopen it in Settings.

## Bundled models

The app uses two local model files that power the offline assistant and voice input:

| Model | Role | Size |
|-------|------|------|
| Qwen2.5-1.5B-Instruct (q4_k_m, GGUF) | Offline AI assistant | ~1.04 GB |
| SenseVoice (int8, ONNX) | Offline speech-to-text (Mandarin, Cantonese, English, Japanese, Korean) | ~0.23 GB |

**Most users have nothing to do**: the installer and the portable build on [Releases](https://github.com/bin1732/yingmai/releases) already include these files.

The model binaries are **not committed to this Git repository**, the same approach used by projects such as llama.cpp and whisper.cpp: the files are large, keeping them out keeps the source tree light, and they can be fetched from a mirror that is reachable in every region. To build or run from source, run `npm run setup`, which downloads the files from an accessible mirror and verifies both size and SHA-256. Git LFS is intentionally not required, so contributors need no extra tooling.

**Choose a stronger local model when you need one**: under “Settings → Local models (optional)”, the app detects the GPU and memory and marks the recommended tier. You can pick a Light, Balanced or Enhanced model to download; it then runs entirely on this device with no other software such as Ollama or LM Studio required. The default built-in model is unchanged, so the app works fully even without downloading anything.

## Feature modules

| Module | Description |
|--------|-------------|
| Dashboard | Business overview, trends, platform distribution, quick links, engine status, sales heatmap |
| Assistant | A floating assistant available everywhere; ask by voice or text about rules, fees, actions, and your data |
| Store connections | Connect directly to marketplaces with your own credentials and sync orders, products, and inventory; credentials stay on your device |
| Products / Listings | Internal product master data (SKU, cost, safety stock) and per-store listing mappings |
| Inventory / Warehouses | Multiple warehouses, stock balances, an append-only stock ledger, transfers |
| Purchasing | Purchase orders, goods receipt, in-transit and receiving progress |
| Orders / Shipping | Order status flow, shipping, tracking, pending-shipment reminders |
| After-sales | Refund-only, return-and-refund, reshipment, exchanges, with automatic inventory updates |
| Customers | RFM segmentation, repurchase, average order value, customer value, cohort retention |
| Profit and loss | Per-order revenue, cost, platform fees, advertising, and net profit; settlement reconciliation |
| Alerts | Stock-outs, late shipping, high refund rates, slow-moving items |
| Sourcing / Competitors | Demand, competition, margin assessment, listing and selling-point comparison |
| Pre-listing check | Qualifications, category, brand, certification, labeling, and logistics checklist before listing |
| Pricing advice | Suggested price from cost, fees, target margin, and competitor range, with a price–profit curve |
| Review analysis | Review insights and negative-review causes; add issues to an improvement list |
| Listings / Service scripts | Titles, bullet points, descriptions, and common customer-service replies |
| Keywords / Advertising | Keyword coverage and banned-word checks; ACOS, TACoS, bidding, and break-even |
| Logistics | Reference transit times and costs for major domestic and cross-border channels |
| Platform rules | Onboarding requirements, fees, and rules for each marketplace |
| Compliance | Pre-listing compliance self-check |
| Prompt library / Copy polish | E-commerce prompt templates for natural, credible product copy |
| Getting started | Step-by-step guidance from identity preparation to first sales |
| Settings | Theme, language, user guide, AI engine configuration, data import/export |

## Supported platforms

**Domestic China**: Taobao, Tmall, JD, Pinduoduo, Douyin E-commerce, Kuaishou E-commerce, Xiaohongshu

**Cross-border**: Amazon, Shopee, TikTok Shop, Shopify, eBay, AliExpress, Lazada, and more

> Connector availability differs by platform and follows the labels and official links in the in-app **Store connections** page: **Shopify connects directly**; **Amazon and eBay** support self-service authorization with your own developer credentials; **Shopee, AliExpress, TikTok Shop, Lazada, and 1688 sourcing** require developer registration and platform review; order-level APIs for **Taobao/Tmall, JD, Pinduoduo, Douyin, Kuaishou, and Xiaohongshu** are mainly available to enterprises and certified service providers, so individual sellers typically rely on manual entry and file import.

## AI engine

- **Bundled model**: loaded by the local inference engine, ready to use offline; it warms up at launch for quick responses.
- **Cloud enhancement (optional)**: connect OpenAI-compatible services such as DeepSeek, Tongyi Qianwen, Zhipu GLM, Moonshot, SiliconFlow, and OpenAI. Pick a provider, enter your API key, and choose **Detect models** to list the models actually available to that key. Official sign-up links are provided.
- **Local models (optional)**: auto-detect and call models served by Ollama, LM Studio, and other OpenAI-compatible setups on your device.
- The chat shows the model currently in use together with usage, and connecting, switching, and switching back all take effect.

## Voice input

The assistant supports speaking instead of typing, which helps users who are less comfortable with a keyboard. The speech model and runtime are bundled and work **offline with no extra download**, supporting Mandarin, Cantonese, English, Japanese, and Korean.

## Hardware adaptation

The app detects your device's memory and hardware and adjusts context length and inference accordingly.

| Configuration | Experience |
|---------------|------------|
| 8 GB dedicated memory or more | Smooth, longer context |
| 4 GB dedicated memory | Usable; GPU and CPU work together |
| CPU only / integrated graphics | Works, at a slower speed |

## Data security and compliance

- The bundled model runs locally; by default business data is not uploaded. Your API keys are stored only on your device and are never distributed with the app.
- Export, import, and back up individual data types or the whole package for migration and archiving.
- Platform rules, fees, and logistics figures are reference values; the latest official announcements take precedence.
- The app does not provide guidance for fake orders, false advertising, infringement, or tax evasion.

## Architecture

The app uses a native Electron desktop architecture organized into presentation, API/application services, AI engine and domain core, marketplace connectors, and data/model layers. See the [Architecture overview](docs/architecture.html).

## Build from source

> For developers; regular users can simply use the installer or the portable build.

```bash
# 1. Install dependencies
npm install

# 2. (Optional) download the bundled models; not needed to run the tests or view the UI
npm run setup

# 3. Run locally
npm run app

# 4. Run the tests (Node built-ins only; no network or models needed)
npm test

# 5. Build the installer and portable app
npm run dist
```

Node.js 18 or newer is required. The model binaries are not committed to Git (see [Bundled models](#bundled-models)); run `npm run setup` to download and verify them, or use the prebuilt packages from [Releases](https://github.com/bin1732/yingmai/releases), which already include them.

## Contributing

Issues and pull requests are welcome. Please read the [Contributing guide](CONTRIBUTING.md), [Code of Conduct](CODE_OF_CONDUCT.md), [Security policy](SECURITY.md), and [Changelog](CHANGELOG.md) first.

## License

GPL v3 (GPL-3.0-only). See [LICENSE](LICENSE); third-party component notices are in [NOTICE](NOTICE).

Marketplace and provider names and logos belong to their respective owners. This project is not officially authorized by or affiliated with them. Platform rules, fees, and APIs may change; please refer to each platform's latest official information.
