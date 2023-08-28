const urlRegex =
  /^(https?:\/\/)?([\w.-]+\.[a-zA-Z]{2,}|[\w.-]+\.[a-zA-Z]{1,3}\.[a-zA-Z]{1,3})(\/\S*)?$/;

export const isValidUrl = (url: string): boolean => {
  return urlRegex.test(url);
};

interface HardCoded {
  [key: string]: string;
  // Other properties and their types
}

export const hardCoded: HardCoded = {
  "harmony.one/dear": `
  . 👩‍💻 Dear Engineer, Our Tech Lead Role in 🌲 Palo Alto...
AUG 6, 2023
… is open! As Harmony’s founder, I’d like to tell you below about the project, your role, and what we are looking for from you.
Ideally you specialize in performance, security and systems – with 3 years of working experience, a degree in computer science, and regular practice of open-source development. You may have built a kernel, a compiler, or a database from scratch before; you enjoy Hacker News, functional idioms, and productivity tools every day.
This “Tech Lead” role is full-time, permanent, onsite in our Palo Alto headquarters in California. The compensation, with a base salary and vesting equity, may range from $160K to $210K. We offer full benefits but not a working visa. You should live within a 30-minute commute to work in office every day; you must love the long work hours and the chaotic grind of startups over years.
We have 6 full-time teammates in office, 15 more across Europe and Asia. You will be working directly with the leadership team of myself, Casey, and Aaron. I lead the team in platform vision, market strategy, and product roadmap. Casey leads in protocol research, network system, and developer community. Aaron leads in backend architecture, product design, and user applications.
You may start with our current initiatives on AI bots, Telegram wallets, domain auctions… then explore our broader roadmap of decentralized protocols, financial products, or cryptographic primitives. Harmony’s mission is “to scale trust and create radically fair economy”. Our next milestones include crypto payments for AI models and products on Telegram, social wallets without separate passwords or devices, and sustainable collectible auctions for .country domains.
Harmony is among the first proof-of-stake, sharding blockchains. Our 2-second transaction finality is one of the fastest; our 1000-slot validator network is one of the most diverse. The project started 5 years ago – launching the network and the ONE token in 2019, staking and delegation in 2020, DeFi and NFT in 2021, DAO and ZK Proofs in 2022, and now Web3 domains and AI bots in 2023. Harmony is venture-backed with its network utility tokens available on crypto exchanges and its treasury of more than 3 years of runway.
You will be challenged to launch features within the first few weeks, and soon to lead a team of 2 to 4 engineers. You will develop an open blockchain of hundreds of network nodes with hundreds of millions of assets. You will pioneer how applying generative models, low-rank adaptation and edge-device inference will bring productivity as well as entertainment to millions of users. You will be an industry leader, engaging in public forums or with our developer ecosystem, not only for your technical expertise but also your empathetic value.
Our backends, written in Go, run on Amazon and other clouds. Our middlewares, written in Solidity, deploy as Ethereum smart contracts. Our frontends, written in Javascript, deploy as React applications. As our commitment to open development and community blockchain, we share all code as public repos on Github and we share development meetings as public videos on YouTube.
You will first have a full-hour interview each with Li, Kushagra and myself in office. Li leads on operations, while Kushagra advises and consults on human resources. You will send in advance your past sample work of a full-page writing and a 100-line code snippet. You will join our lunch to chat with other teammates. The next steps are technical interviews with Aaron and Casey on Zoom, another day of onsite sessions, and finally a 2-day paid joint-work session. The decision and the offer usually come within 24 hours. Your employment may start within a week, ideally before October 15th.
Apply now on harmony.one/lever? You may learn more from the long posts “ONE Bot on Telegram for AI” and “Radically Fair for 1.country” on my Substack blog.s.country. Feel free to contact me anytime via s@harmony.one or Telegram @stephentse.
  `,
  "harmony.one": `
Can you reply with just text with no links or formattting or anything:
Harmony ONE
Harmony is an open and fast blockchain. Our mainnet runs Ethereum applications with 2-second transaction finality and 100 times lower fees. AI developers can use onchain tokens for micro-payments, smart contracts for market pricing, and zero-knowledge proofs for data privacy.
Harmony’s mission is to scale trust and create a radically fair economy. Our platform is decentralized, scalable and secure to settle any transactions without trusted parties.
🕒Products · 👨‍👩‍👧‍👦News · 🤝Protocol · 🌳Ecosystem · 🌊Creative · 🧗‍♀️Roadmap
🧚‍♀️ Telegram AI Bot & 1.country Web3 Domains
notion image
Try our Telegram AI bot? Use ONE tokens for ChatGPT4, Stable Diffusion XL photorealism, voice meeting summarization.
Free SSL certificates, Notion custom hosting – all ready in 5 minutes. Own single-letter domain NFTs like h.country.
➡️ Our AI ∩ Crypto blog on Web3 future
🕒 Decentralized Products: Onchain Security
We are an open platform for your assets, collectibles, identity and governance. Our protocol decentralizes coordination among global communities – by enforcing contracts without trusting third parties or prior rules.
notion image
Defira immersive DeFi role-playing adventure game
notion image
Layer Zero Bridge secure & cross-chain transfers
notion image
Gnosis Multisig shared asset custody & control
notion image
Timeless Wallet native mobile & social experience
notion image
Swap capital efficient liquidity pools
notion image
Hummingbot open source market making
➡️ Explore our DeFi yields & NFT collections
👨‍👩‍👧‍👦 Community News: Radical Transparency
Harmony aims for open governance and vibrant participation of our ecosystem.
More news & announcements…
➡️ Subscribe to our newsletters & tweets
🤝 Blockchain Protocol: Scaling & Security
Harmony’s vision is to create cooperation for global communities, and scale their digital economies.
1. Secure, Random State Sharding
Harmony has transcended the blockchain trilemma by bringing the best research to production. Sharding is proven to scale blockchains without compromising security and decentralization.
We divide not only our network nodes but also the blockchain states into shards, scaling linearly in all three aspects of machines, transactions and storage.‍ To prevent single shard attacks, we must have a sufficiently large number of nodes per shard and cryptographic randomness to re-shard regularly. Each shard has 250 nodes for strong security guarantee against Byzantine behaviors. We use Verifiable Delay Function (VDF) for unbiasable and unpredictable shard membership.
2. Effective PoS & Token Economics
Harmony has designed a novel Proof-of-Stake (PoS) mechanism for network security and economics. Our Effective Proof-of-Stake (EPoS) reduces centralization and distributes rewards fairly to thousands of validators. Our staking mechanism supports delegation and reward compounding.
To support 100% uptime but fully open participation, EPoS slashes validators who double-sign and it penalizes elected but unavailable nodes.Harmony Economics Model caps the annual issuance at 441 million tokens (about 3% rate in long term). Our model gives validators a simple and predictable return. All transaction fees are burnt to offset the issuance, naturally leading to zero inflation when our network usage becomes high.
3. Fast Consensus, Instant Finality
Harmony has innovated on the battle-tested Practical Byzantine Fault Tolerance (PBFT) for fast consensus of block transactions. Our Fast BFT (FBFT) leads to low transaction fees and 1-block-time finality in Harmony Mainnet.‍
We use Boneh–Lynn–Shacham (BLS) constant-sized signatures to commit blocks in a single round of consensus messages. We achieve 2-second block time with view changes in production against adversarial or unavailable leaders.‍ Harmony Mainnet was launched in June 2019. Our network has produced 41M blocks with 772k transactions in publicly traded, native ONE tokens.
4. Keyless Smart Wallets
Resilient. Funds are recoverable through time locks and multiple safety nets. No single point of failure such as thefts, cracks, loss, censorship or coercions is catastrophic.
Sufficient. All steps are well defined without delegating to hardware devices or seed phrases in safety boxes. Users do not need any passwords or rely on biometrics.
Composable. One-time or low-entropy passwords are useful for small funds. Multiple authentications can independently boost protection thresholds against brute-force.
Self-Sovereign. No third parties, government documents, designated guardians, backup servers or hardware enclaves are necessary. Users have full custody and self control.
➡️ Join our governance discussion & zero-knowledge proof course
🌳 Ecosystem Partners: Open Development
A blockchain, as a marketplace full of incentives, allows anyone to create tokens, secure transactions between parties, and accrue values from serving utility.
👝 Protofire Multi-signature wallet
🤖 Hummingbot Market making
💫 InfStone Staking validator
🎸 dj3n Creator-fan Collectibles
💬 SMS Wallet Light asset custody
📈 CoinMarketCap Exchange markets
📚 Common Prefix Production research
➕ Add3 Smart contract deployer
👨‍🎤 MAD Collectible marketplace
🗳️ Snapshot Governance voting
🛡️ SlowMist Security audit
🏂 SporkDAO Ethereum Denver
🦙 DeFiLlama Asset locked dashbaord
🪄 Magic Authentication services
⚾ Rosetta Coinbase Data API
🏫 Defiant DeFi education
🔄 Swap Capital efficient liquidity pools
🦊 MetaMask Mobile & browser wallet
0️⃣ zkDAO Cryptography scholars
🌳 Blue Forest ZKProof game
🌐 Pocket Networks Service endpoints
🏦 Aave Lending pools
🪝 Curve Stable pools
🦙 DefiLlama Yield dashboard
🛫 Travala Travel payments
🔗 Chainlink Data oracle
🔑 NFTKey Collectible marketplace
☢️ DappRadar User & activity ranking
🦶Footprint Analytics dashboard
👩‍💻 Gitcoin Hackathon bounties
💽 Band Data oracle
📊 Graph Data indexing
➡️ Reach us at Discord or open voting
🌊 Creative Campaigns: The ONEs Who Build
They believe in radical social change. ONE where trust is not needed to participate. ONE where everyone can sing in harmony. And we will be the ONEs to build it.
Video preview
Video preview
Video preview
Video preview
Video preview
➡️ Tell us your story or design
🧗‍♀️ 2023 Roadmap: Sustainable Economy
We are a Day-1 startup. Blockchains are becoming the foundation of the global economy, yet their adoption is at only 1%. That means that you as a pioneer and developer are shaping the future with 10X impact. Harmony is a community-driven project, a network with hundreds of applications, and a team wearing crazy ambitions on their sleeves. Because the invincible summer awaits!
✅ Domain Affiliates
✅ Native Stablecoin
✅ Validator Economics
State Sync & Pruning
Account Abstraction
✅ Telegram AI Bots
Model & Agent Markets
Radical .1 Markets
1-Second Finality
Onchain Registrars
Domain Auctions
Social Recovery Wallets
➡️ Join our team & code development
Substack · Twitter · YouTube · Reddit
Discord · Telegram · Instagram · Linkedin
©️ Harmony 2023 💌 hello@harmony.one
Buy Tokens
Exchanges
Staking
Explorer
Open Source
Developer Docs
Whitepaper
Token Economics
Your Career
Community Forum
Open Development
Branding Kits 
  `,
};
