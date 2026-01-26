import type { Article, Summary, Newsletter, WatchlistItem, TopicCategory } from "@/types";

export const mockArticles: (Article & { summary?: Summary })[] = [
  {
    id: "1",
    title: "Sequoia Leads $200M Series C for AI Infrastructure Startup Foundry",
    source: "TechCrunch",
    sourceUrl: "https://techcrunch.com",
    author: "Connie Loizos",
    publishedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    topic: "vc-startups",
    content: `Foundry, the AI infrastructure startup that has been quietly building tools for enterprise machine learning deployment, has raised $200 million in a Series C round led by Sequoia Capital.

The round values the company at $2.4 billion, up from $800 million in its Series B just 14 months ago. Other participants include existing investors Lightspeed Venture Partners and Greylock Partners, along with new investor Tiger Global.

Founded in 2021 by former Google Brain researchers Sarah Chen and Marcus Williams, Foundry has built a platform that allows enterprises to deploy, monitor, and scale AI models without requiring deep ML expertise. The company says its revenue has grown 4x year-over-year, with over 200 enterprise customers including three Fortune 50 companies.

"We're seeing unprecedented demand from enterprises that want to deploy AI but lack the infrastructure and tooling to do so reliably," said CEO Sarah Chen. "This funding will help us expand internationally and invest in our next-generation orchestration layer."

Roelof Botha, managing partner at Sequoia Capital, will join Foundry's board. "Foundry is building the picks-and-shovels of the AI revolution," Botha said. "Their approach to abstracting away infrastructure complexity is exactly what the market needs."

The company currently has 340 employees across offices in San Francisco, New York, and London, and plans to grow to 500 by end of year.`,
    imageUrl: "https://picsum.photos/seed/foundry/800/400",
    readingTimeMinutes: 4,
    isRead: false,
    isSaved: false,
    watchlistMatches: ["Sequoia", "Lightspeed"],
    summary: {
      id: "s1",
      articleId: "1",
      brief: "Sequoia leads $200M Series C for AI infrastructure startup Foundry at $2.4B valuation.",
      theNews: "Foundry, an AI infrastructure startup founded by former Google Brain researchers, has raised $200 million in a Series C round led by Sequoia Capital. The round values the company at $2.4 billion, tripling its valuation from 14 months ago. The platform helps enterprises deploy and manage AI models without deep ML expertise, and claims 200+ enterprise customers with 4x YoY revenue growth.",
      whyItMatters: "This deal signals continued aggressive VC investment in AI infrastructure despite broader market cooling. Sequoia's involvement—with Roelof Botha joining the board—adds significant credibility. For recruiters: Foundry is scaling from 340 to 500 employees, creating substantial leadership hiring needs. The AI infrastructure space remains one of the hottest for executive talent.",
      theContext: "Foundry competes with companies like Weights & Biases, MLflow, and Databricks' ML platform. The AI infrastructure market is projected to reach $150B by 2028. Sequoia has been doubling down on AI investments, having also recently backed companies in the AI agent and foundation model spaces.",
      keyEntities: [
        { name: "Sequoia Capital", type: "fund" },
        { name: "Foundry", type: "company" },
        { name: "Sarah Chen", type: "person" },
        { name: "Roelof Botha", type: "person" },
        { name: "Lightspeed Venture Partners", type: "fund" },
        { name: "Tiger Global", type: "fund" },
      ],
      generatedAt: new Date().toISOString(),
    },
  },
  {
    id: "2",
    title: "Former Stripe CTO David Singleton Joins Stealth AI Company as CEO",
    source: "The Information",
    sourceUrl: "https://theinformation.com",
    author: "Amir Efrati",
    publishedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    topic: "executive-movements",
    content: `David Singleton, who served as CTO of Stripe for nearly five years, has left the payments giant to become CEO of a stealth AI startup focused on autonomous financial operations.

The startup, which has not yet publicly launched, has raised approximately $50 million in seed and Series A funding from Andreessen Horowitz and Thrive Capital. Sources familiar with the matter say the company is building AI agents capable of handling complex financial workflows end-to-end.

Singleton's departure from Stripe was quiet—he officially left in December, though the company did not make a public announcement. At Stripe, he oversaw the engineering organization of over 3,000 engineers and was instrumental in building Stripe's developer platform and API infrastructure.

"David is one of the most talented technical leaders in fintech," said an investor familiar with the deal. "The combination of his Stripe experience and this AI-native approach to financial operations could be transformative."

Before Stripe, Singleton spent over a decade at Google, where he led Android Wear and served as VP of Engineering. He is known for his ability to build and scale engineering organizations.

The stealth company reportedly has about 30 employees, most recruited from Stripe, Google, and OpenAI.`,
    imageUrl: "https://picsum.photos/seed/singleton/800/400",
    readingTimeMinutes: 3,
    isRead: false,
    isSaved: true,
    watchlistMatches: ["a16z"],
    summary: {
      id: "s2",
      articleId: "2",
      brief: "Former Stripe CTO David Singleton becomes CEO of stealth AI fintech startup backed by a16z.",
      theNews: "David Singleton, Stripe's former CTO who managed 3,000+ engineers, has quietly left to become CEO of a stealth startup building AI agents for autonomous financial operations. The company has raised ~$50M from Andreessen Horowitz and Thrive Capital and has ~30 employees from Stripe, Google, and OpenAI.",
      whyItMatters: "This is a significant executive move in the fintech-AI intersection. Singleton is a rare caliber of technical leader, and his departure from Stripe suggests he sees a massive opportunity in AI-powered financial operations. For recruiters: this creates a CTO vacuum at Stripe, and the stealth company will be aggressively hiring senior technical leaders as it scales.",
      theContext: "There's a growing trend of senior tech executives leaving established companies to lead AI startups. Stripe itself has been investing heavily in AI features. The AI agent space for enterprise workflows is one of the most funded categories in 2025-2026.",
      keyEntities: [
        { name: "David Singleton", type: "person" },
        { name: "Stripe", type: "company" },
        { name: "Andreessen Horowitz", type: "fund" },
        { name: "Thrive Capital", type: "fund" },
      ],
      generatedAt: new Date().toISOString(),
    },
  },
  {
    id: "3",
    title: "Fed Holds Rates Steady, Signals Potential Cut in March Amid Cooling Inflation",
    source: "Reuters",
    sourceUrl: "https://reuters.com",
    author: "Howard Schneider",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    topic: "financial-markets",
    content: `The Federal Reserve held interest rates unchanged on Wednesday but signaled that a rate cut could come as early as March, as inflation continues to cool toward the central bank's 2% target.

The federal funds rate remains at the 4.25%-4.50% range, where it has been since December. But the language in the Fed's statement shifted notably, removing the phrase "further progress" on inflation and instead noting that price pressures have "diminished considerably."

Fed Chair Jerome Powell, speaking at the post-meeting press conference, said the committee is "closely monitoring" conditions and that "the data are moving in the right direction." He stopped short of committing to a March cut but acknowledged that the risks of holding too long are "becoming more balanced."

Markets rallied on the news, with the S&P 500 rising 1.2% and the Nasdaq gaining 1.5%. Treasury yields fell, with the 10-year dropping to 4.1%.

Economists are now pricing in a 70% probability of a 25 basis point cut in March, up from 45% before the meeting. Goldman Sachs revised its forecast to expect three cuts in 2026, totaling 75 basis points.`,
    readingTimeMinutes: 5,
    isRead: false,
    isSaved: false,
    watchlistMatches: [],
    summary: {
      id: "s3",
      articleId: "3",
      brief: "Fed holds rates at 4.25-4.50% but signals March cut likely as inflation cools.",
      theNews: "The Federal Reserve kept rates unchanged but adopted notably dovish language, removing references to needing 'further progress' on inflation. Chair Powell indicated conditions are 'moving in the right direction,' and markets now price in a 70% chance of a March cut. The S&P 500 rallied 1.2% on the news.",
      whyItMatters: "Rate cuts directly impact startup fundraising and venture capital activity. Lower rates make risk assets more attractive, potentially accelerating deal flow and valuations in the startup ecosystem. This could also affect hiring: cheaper capital means more runway, which means more aggressive talent acquisition at portfolio companies.",
      theContext: "The Fed has held rates in restrictive territory for over a year after the aggressive hiking cycle of 2023-2024. Inflation has come down from a peak of 9.1% to near 2.3%. The tech sector, which is particularly rate-sensitive, has been eagerly anticipating cuts.",
      keyEntities: [
        { name: "Federal Reserve", type: "company" },
        { name: "Jerome Powell", type: "person" },
        { name: "Goldman Sachs", type: "company" },
      ],
      generatedAt: new Date().toISOString(),
    },
  },
  {
    id: "4",
    title: "Anthropic and OpenAI Race to Deploy Enterprise AI Agents That Can Execute Multi-Step Workflows",
    source: "Wired",
    sourceUrl: "https://wired.com",
    author: "Will Knight",
    publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    topic: "science-tech",
    content: `The next frontier in AI isn't chatbots—it's agents that can independently execute complex, multi-step business workflows. Both Anthropic and OpenAI are racing to deploy these systems for enterprise customers, and the competition is intensifying.

Anthropic this week previewed its enterprise agent platform, which allows Claude to interact with company systems, make API calls, and execute workflows that span multiple tools and databases. The system includes built-in safety guardrails and audit trails.

OpenAI, not to be outdone, announced expanded capabilities for its GPT-based agent framework, including deeper integrations with Salesforce, SAP, and ServiceNow. The company claims early enterprise pilots have shown 40% productivity gains in customer service and back-office operations.

Industry analysts estimate the enterprise AI agent market could be worth $50 billion by 2028, up from approximately $3 billion today. The key challenge is trust: enterprises need agents that are reliable, auditable, and don't hallucinate when handling real business operations.

"We're at an inflection point," said Sarah Guo, founder of Conviction Capital and an investor in several AI companies. "The shift from AI as a tool to AI as a worker is the biggest platform shift since mobile."

Both companies are also competing fiercely for enterprise customers. Anthropic has signed deals with major financial institutions and government agencies, while OpenAI has focused on Fortune 500 companies through its partnership with Microsoft.`,
    readingTimeMinutes: 6,
    isRead: true,
    isSaved: false,
    watchlistMatches: [],
    summary: {
      id: "s4",
      articleId: "4",
      brief: "Anthropic and OpenAI compete to build enterprise AI agents for autonomous multi-step workflows.",
      theNews: "Both Anthropic and OpenAI are launching enterprise AI agent platforms that can independently execute multi-step business workflows. Anthropic previewed its platform with safety guardrails and audit trails, while OpenAI announced deeper enterprise integrations showing 40% productivity gains in pilots. The enterprise AI agent market is projected to reach $50B by 2028.",
      whyItMatters: "This represents a fundamental shift from AI as a chatbot to AI as an autonomous worker. For the recruiting industry, AI agents handling workflow automation will create massive demand for executives who understand both AI capabilities and enterprise operations. Companies adopting these systems will also restructure roles, creating executive placement opportunities.",
      theContext: "The AI agent space has attracted billions in VC funding over the past year. Key players include Anthropic, OpenAI, Google DeepMind, and a growing number of startups. Enterprise adoption is still early—most companies are in pilot or proof-of-concept stages.",
      keyEntities: [
        { name: "Anthropic", type: "company" },
        { name: "OpenAI", type: "company" },
        { name: "Sarah Guo", type: "person" },
        { name: "Conviction Capital", type: "fund" },
      ],
      generatedAt: new Date().toISOString(),
    },
  },
  {
    id: "5",
    title: "a16z Closes New $4.5B Growth Fund Targeting Late-Stage AI and Crypto Companies",
    source: "StrictlyVC",
    sourceUrl: "https://strictlyvc.com",
    author: "Connie Loizos",
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    topic: "vc-startups",
    content: `Andreessen Horowitz has closed its latest growth fund at $4.5 billion, the firm's largest dedicated growth vehicle to date. The fund will primarily target late-stage AI and crypto companies approaching IPO readiness.

The fund, internally called "Growth Fund V," was oversubscribed from a target of $3.5 billion. Limited partners include major sovereign wealth funds, university endowments, and family offices.

Managing Partner Marc Andreessen said in a statement that the fund reflects "the most exciting technology cycle we've seen since the internet itself." The firm plans to make 15-25 investments from the fund, with typical check sizes of $100M-$500M.

A16z has been one of the most aggressive investors in AI, with portfolio companies including Mistral, Character.AI, Glean, and ElevenLabs. The firm has also doubled down on crypto with investments in Uniswap, LayerZero, and several blockchain infrastructure companies.

The new fund brings a16z's total assets under management to over $42 billion, solidifying its position as one of the largest venture capital firms globally. The firm recently opened a new office in London to expand its European presence.`,
    readingTimeMinutes: 3,
    isRead: false,
    isSaved: false,
    watchlistMatches: ["a16z"],
    summary: {
      id: "s5",
      articleId: "5",
      brief: "Andreessen Horowitz closes $4.5B growth fund, its largest ever, targeting AI and crypto.",
      theNews: "a16z has closed a $4.5B growth fund (oversubscribed from $3.5B target) focused on late-stage AI and crypto companies. The fund will make 15-25 investments at $100M-$500M per deal. This brings a16z's total AUM to $42B+. The firm is also expanding to London.",
      whyItMatters: "This massive fund signals that top-tier VCs see significant upside remaining in AI and crypto. Late-stage funding at this scale means more companies will stay private longer and grow to significant scale before IPO. For recruiters: a16z portfolio companies funded from this vehicle will be hiring aggressively at the executive level to prepare for public markets.",
      theContext: "a16z has been one of the most prolific AI investors. The growth fund follows their $7.2B in funds raised in 2022. The crypto component reflects a16z's long-term thesis despite the sector's volatility. Several a16z portfolio companies are expected to IPO in 2026.",
      keyEntities: [
        { name: "Andreessen Horowitz", type: "fund" },
        { name: "Marc Andreessen", type: "person" },
      ],
      generatedAt: new Date().toISOString(),
    },
  },
  {
    id: "6",
    title: "EU Passes Landmark AI Liability Directive, Companies Face New Compliance Requirements",
    source: "Financial Times",
    sourceUrl: "https://ft.com",
    author: "Madhumita Murgia",
    publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    topic: "geopolitics",
    content: `The European Union has passed its AI Liability Directive, establishing a legal framework that holds companies responsible for damages caused by AI systems. The directive, which goes into effect in 12 months, represents the most significant regulatory action on AI to date.

Under the new rules, companies deploying AI systems that cause harm—whether through automated decisions, errors, or biases—can be held liable even if the AI's behavior was not explicitly intended. The burden of proof in many cases shifts to the deploying company.

Tech companies have warned the directive could stifle innovation in Europe. A coalition including Google, Microsoft, and Meta sent a joint letter arguing the rules are "overly broad" and could make Europe uncompetitive in AI development.

However, consumer groups and civil rights organizations have praised the move. "This is a necessary step to ensure AI serves people, not just profits," said a spokesperson for the European Consumer Organisation.

The directive includes exemptions for AI used in scientific research and small companies with fewer than 50 employees. Companies will need to maintain detailed documentation of AI system behavior and implement regular audits.`,
    readingTimeMinutes: 5,
    isRead: false,
    isSaved: false,
    watchlistMatches: [],
    summary: {
      id: "s6",
      articleId: "6",
      brief: "EU passes AI Liability Directive making companies responsible for AI-caused damages.",
      theNews: "The EU has passed its AI Liability Directive, which holds companies liable for damages caused by their AI systems, with the burden of proof shifting to deploying companies. It goes into effect in 12 months and requires detailed documentation and regular audits. Tech giants have criticized it as overly broad.",
      whyItMatters: "European AI regulation is setting a global standard that will likely influence policy elsewhere. Companies deploying AI in Europe will need to hire compliance officers and legal experts specializing in AI governance. This creates a new category of executive hiring—Chief AI Ethics Officers and VP of AI Compliance roles are emerging rapidly.",
      theContext: "This follows the EU AI Act passed in 2024. The US has taken a more hands-off regulatory approach. China has its own AI regulations. The regulatory divergence is creating complexity for companies operating globally.",
      keyEntities: [
        { name: "European Union", type: "company" },
        { name: "Google", type: "company" },
        { name: "Microsoft", type: "company" },
        { name: "Meta", type: "company" },
      ],
      generatedAt: new Date().toISOString(),
    },
  },
  {
    id: "7",
    title: "Rivian Reports Strong Q4, Vehicle Deliveries Beat Expectations by 15%",
    source: "Automotive News",
    sourceUrl: "https://autonews.com",
    author: "Michael Martinez",
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    topic: "automotive",
    content: `Rivian Automotive reported better-than-expected Q4 results, delivering 18,200 vehicles—15% above analyst estimates of 15,800. The company also narrowed its losses and reaffirmed its path to gross profit positivity by mid-2026.

Revenue came in at $1.8 billion, up 35% year-over-year. The company's loss per vehicle improved to approximately $22,000 from $33,000 a year ago, reflecting better manufacturing efficiency at its Normal, Illinois plant.

CEO RJ Scaringe said the company's new R2 platform, scheduled for production in 2026, has received over 100,000 pre-orders. The more affordable R2 SUV, starting at $45,000, is expected to significantly expand Rivian's addressable market.

Rivian's partnership with Volkswagen Group also progressed, with the joint software venture now employing over 1,000 engineers. The partnership is developing shared electrical architecture and software for both companies' next-generation vehicles.

Shares rose 12% in after-hours trading. Analysts at Morgan Stanley upgraded the stock to Overweight, citing improving unit economics and the R2 opportunity.`,
    readingTimeMinutes: 4,
    isRead: false,
    isSaved: false,
    watchlistMatches: [],
    summary: {
      id: "s7",
      articleId: "7",
      brief: "Rivian beats Q4 delivery expectations by 15%, stock surges 12% after hours.",
      theNews: "Rivian delivered 18,200 vehicles in Q4, beating estimates by 15%. Revenue grew 35% YoY to $1.8B, and loss per vehicle improved from $33K to $22K. The R2 platform has 100K+ pre-orders, and the VW software partnership now has 1,000+ engineers. Morgan Stanley upgraded the stock.",
      whyItMatters: "Rivian's improving trajectory suggests the EV startup market may be stabilizing. The VW partnership validates Rivian's technology. For the automotive sector: Rivian will be hiring senior leaders for the R2 launch and scaling its manufacturing operations, creating executive opportunities.",
      theContext: "The EV market has been challenging, with Tesla's growth slowing and several EV startups struggling or failing. Rivian stands out as one of the few independent EV companies with improving fundamentals. The broader auto industry is navigating the transition from ICE to electric.",
      keyEntities: [
        { name: "Rivian", type: "company" },
        { name: "RJ Scaringe", type: "person" },
        { name: "Volkswagen Group", type: "company" },
        { name: "Morgan Stanley", type: "company" },
      ],
      generatedAt: new Date().toISOString(),
    },
  },
  {
    id: "8",
    title: "San Francisco Approves $2B Downtown Revitalization Plan Focused on AI Industry Hub",
    source: "San Francisco Chronicle",
    sourceUrl: "https://sfchronicle.com",
    author: "Roland Li",
    publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    topic: "local-news",
    content: `San Francisco's Board of Supervisors unanimously approved a $2 billion downtown revitalization plan that aims to transform the struggling Financial District into an AI industry hub.

The plan includes tax incentives for AI companies that establish headquarters downtown, $500 million in infrastructure improvements including high-speed fiber throughout the district, conversion of underutilized office buildings into mixed-use spaces, and a new public AI research campus affiliated with UC Berkeley and Stanford.

Mayor London Breed called it "the most significant investment in San Francisco's future since the post-earthquake rebuilding." The plan is partially funded by a bond measure and partially by public-private partnerships with tech companies including Anthropic, OpenAI, and Salesforce.

The downtown vacancy rate, which peaked at 34% in 2024, has already begun declining as AI companies have leased significant space. Anthropic recently signed a lease for 400,000 square feet, and several other AI startups are expanding downtown.

Critics argue the plan disproportionately benefits tech companies at the expense of other industries and affordable housing. Supervisor Dean Preston called for stronger community benefit requirements, though he ultimately voted for the plan.`,
    readingTimeMinutes: 4,
    isRead: false,
    isSaved: false,
    watchlistMatches: [],
    summary: {
      id: "s8",
      articleId: "8",
      brief: "SF approves $2B plan to convert downtown into AI industry hub with tax incentives.",
      theNews: "San Francisco's Board of Supervisors approved a $2B plan to revitalize downtown as an AI hub, including tax incentives for AI companies, $500M in infrastructure, and a public AI research campus with UC Berkeley/Stanford. Anthropic has already leased 400K sq ft downtown.",
      whyItMatters: "This signals San Francisco's commitment to remaining the center of AI development. For recruiters, this means continued concentration of AI talent and companies in SF, making it the primary market for AI executive placement. The infrastructure investments will also attract companies currently considering other locations.",
      theContext: "SF's downtown has struggled since the pandemic, with high vacancy rates. The AI boom has begun reversing this trend. Other cities including Austin, New York, and London are also competing to attract AI companies.",
      keyEntities: [
        { name: "Anthropic", type: "company" },
        { name: "OpenAI", type: "company" },
        { name: "London Breed", type: "person" },
      ],
      generatedAt: new Date().toISOString(),
    },
  },
  {
    id: "9",
    title: "Congress Introduces Bipartisan Bill to Create National AI Safety Institute with $5B Budget",
    source: "Politico",
    sourceUrl: "https://politico.com",
    author: "Mohar Chatterjee",
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    topic: "politics",
    content: `A bipartisan group of senators introduced legislation to establish a National AI Safety Institute with a $5 billion budget over five years. The bill, co-sponsored by Senators Chuck Schumer and Todd Young, would create a new federal agency responsible for testing, evaluating, and certifying AI systems.

The institute would develop standardized testing protocols for AI systems, maintain a public registry of AI incidents and failures, fund research into AI safety and alignment, and coordinate with international partners on AI governance.

"AI is moving faster than any technology in history, and we need an institution that can keep pace," said Senator Schumer. "This isn't about slowing innovation—it's about ensuring AI develops safely."

The bill has support from both tech companies and civil society groups, though some Silicon Valley leaders have expressed concern about potential overreach. OpenAI CEO Sam Altman called it "a step in the right direction" while cautioning that the institute should "enable innovation, not create bureaucratic bottlenecks."

The bill is expected to receive committee hearings in February and could reach the Senate floor by spring.`,
    readingTimeMinutes: 4,
    isRead: false,
    isSaved: false,
    watchlistMatches: [],
    summary: {
      id: "s9",
      articleId: "9",
      brief: "Bipartisan bill proposes $5B National AI Safety Institute for testing and certifying AI systems.",
      theNews: "Senators Schumer and Young introduced a bipartisan bill to create a National AI Safety Institute with $5B in funding over five years. The institute would develop testing protocols, maintain an AI incident registry, fund safety research, and coordinate internationally. The bill has broad support and may reach the Senate floor by spring.",
      whyItMatters: "US AI regulation is taking shape, and this institute could become the primary regulatory body for AI companies. Companies will need to prepare for certification requirements, creating demand for regulatory affairs and compliance executives. This also signals government willingness to invest significantly in AI governance infrastructure.",
      theContext: "The US has lagged behind the EU in formal AI regulation. This bill represents the most concrete legislative proposal for AI oversight. The bipartisan nature suggests it has real momentum, unlike previous partisan tech regulation efforts.",
      keyEntities: [
        { name: "Chuck Schumer", type: "person" },
        { name: "Sam Altman", type: "person" },
        { name: "OpenAI", type: "company" },
      ],
      generatedAt: new Date().toISOString(),
    },
  },
  {
    id: "10",
    title: "Lightspeed Backs $80M Series B for Fraud Detection Startup Using Graph Neural Networks",
    source: "Fortune",
    sourceUrl: "https://fortune.com",
    author: "Lucinda Shen",
    publishedAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
    topic: "fundraising-acquisitions",
    content: `Lightspeed Venture Partners has led an $80 million Series B round for Sentinel AI, a startup using graph neural networks to detect financial fraud in real-time. The round also included participation from Accel and Index Ventures.

Sentinel AI's technology analyzes transaction networks as graphs, identifying suspicious patterns that traditional rule-based systems miss. The company claims its system catches 3x more fraud than conventional approaches while reducing false positives by 60%.

CEO and co-founder Dr. Priya Patel, formerly VP of Engineering at PayPal's fraud detection team, said the funding will be used to expand into new financial verticals including insurance and healthcare payments.

"Financial fraud is a $50 billion annual problem," said Patel. "Traditional approaches are fundamentally limited because they look at transactions in isolation. Our graph-based approach understands the relationships between actors, which is how fraud actually works."

Lightspeed Partner Ravi Mhatre said the firm was impressed by Sentinel AI's rapid traction: the company has signed 15 financial institution customers in its first year, including two top-20 US banks.`,
    readingTimeMinutes: 3,
    isRead: false,
    isSaved: false,
    watchlistMatches: ["Lightspeed", "fraud detection"],
    summary: {
      id: "s10",
      articleId: "10",
      brief: "Lightspeed leads $80M Series B for Sentinel AI, a graph-based fraud detection startup.",
      theNews: "Sentinel AI raised $80M Series B led by Lightspeed to scale its graph neural network-based fraud detection platform. Founded by a former PayPal VP of Engineering, the company claims 3x better fraud detection with 60% fewer false positives. It has 15 financial institution customers including two top-20 US banks.",
      whyItMatters: "Graph neural networks for fraud detection is an emerging category with massive potential. Lightspeed's backing signals confidence in this approach. For recruiters: Sentinel AI is scaling rapidly and will need senior sales, engineering, and operations leaders. The fraud detection space broadly is seeing consolidation and executive movement.",
      theContext: "Financial fraud costs $50B+ annually. Traditional detection relies on rules-based systems. AI-powered approaches, especially using graph networks, are showing superior results. Competitors include Featurespace, Feedzai, and Sardine.",
      keyEntities: [
        { name: "Lightspeed Venture Partners", type: "fund" },
        { name: "Sentinel AI", type: "company" },
        { name: "Priya Patel", type: "person" },
        { name: "Accel", type: "fund" },
      ],
      generatedAt: new Date().toISOString(),
    },
  },
];

export const mockNewsletters: Newsletter[] = [
  {
    id: "nl1",
    publication: "StrictlyVC",
    subject: "StrictlyVC — January 25, 2026",
    receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    content: `Happy Saturday! Here's your weekend roundup of the biggest VC deals, exits, and moves.

**Top Deals This Week:**

1. **Foundry** raised $200M Series C led by Sequoia Capital at $2.4B valuation. AI infrastructure for enterprise ML deployment.

2. **Sentinel AI** raised $80M Series B led by Lightspeed. Graph neural network-based fraud detection.

3. **NovaBio** raised $150M Series B led by Flagship Pioneering. AI-driven drug discovery platform.

4. **CloudWeave** raised $60M Series A led by Bessemer. Multi-cloud cost optimization.

5. **Pocket FM** raised $100M Series D led by Goodwater Capital. Audio entertainment platform.

**Exits:**
- Plaid acquired Finch (HR/payroll API) for $210M
- Vista Equity acquired Momentive (formerly SurveyMonkey) in $4.8B take-private

**People Moves:**
- David Singleton left Stripe CTO role to become CEO of stealth AI startup
- Former Uber CFO Nelson Chai joins Tiger Global as operating partner
- Sapphire Ventures promotes Jai Das to Managing Director

**Weekend Read:** Our deep dive on the AI infrastructure market and why VCs are pouring billions into "picks and shovels" plays.`,
    isRead: false,
  },
  {
    id: "nl2",
    publication: "Finimize",
    subject: "Your Daily Markets Briefing — January 25",
    receivedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    content: `Good morning! Here's what moved markets today.

**The Big Picture:**
The Fed held rates steady but dropped key hawkish language, sending stocks higher. The S&P 500 gained 1.2% and the Nasdaq jumped 1.5%. Bond yields fell as traders priced in a 70% probability of a March rate cut.

**What You Need to Know:**

📈 **Markets Up:** All three major indices closed higher. Tech led gains, with the NASDAQ-100 up 1.7%. Small caps rallied 2.1% on rate cut hopes.

💰 **Fed Watch:** Chair Powell noted inflation has "diminished considerably." Goldman now expects three cuts in 2026 (75bps total). The market sees 70% odds of a March move.

🏢 **Earnings:** Microsoft beat estimates on cloud strength (Azure up 33% YoY). Intel missed and guided lower. Apple reports next week.

🌍 **Global:** European markets followed the US higher. The ECB is expected to cut rates by 25bps next week. China's PMI came in below expectations.

**Chart of the Day:**
The spread between the 2-year and 10-year Treasury has normalized after being inverted for over 18 months—historically, a signal that recession risks are fading.

**The Takeaway:** Rate cuts are coming. The question is how fast. Position for a gradually loosening environment.`,
    isRead: false,
  },
  {
    id: "nl3",
    publication: "The Hustle",
    subject: "AI agents are coming for your job (but creating new ones too)",
    receivedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    content: `Hey there,

The hottest thing in tech right now isn't a new app or gadget—it's AI agents. And this week, both Anthropic and OpenAI made major moves.

**What's an AI agent?**
Think of it as an AI that doesn't just answer questions, but actually does things. Books your flights. Processes your invoices. Writes and sends emails. Manages your calendar. All autonomously.

**This week:**
- Anthropic previewed its enterprise agent platform with Claude
- OpenAI expanded its agent framework with Salesforce/SAP integrations
- Early pilots show 40% productivity gains in enterprise settings

**The job impact:**
McKinsey estimates AI agents could automate 30% of work tasks by 2030. But they'll also create new roles: AI operations managers, agent supervisors, prompt engineers, and AI safety specialists.

**The money:**
The enterprise AI agent market is projected to hit $50B by 2028. VCs invested $12B in agent startups in 2025 alone.

**Our take:** AI agents won't replace you. But someone using AI agents might. The key is learning to work with them, not against them.

See you tomorrow,
The Hustle Team`,
    isRead: true,
  },
];

export const mockWatchlist: WatchlistItem[] = [
  { id: "w1", name: "Sequoia Capital", type: "fund", createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "w2", name: "Andreessen Horowitz", type: "fund", createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "w3", name: "Lightspeed Venture Partners", type: "fund", createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "w4", name: "Stripe", type: "company", createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "w5", name: "Anthropic", type: "company", createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "w6", name: "OpenAI", type: "company", createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "w7", name: "fraud detection", type: "keyword", createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "w8", name: "Series B", type: "keyword", createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
];

export const topicLabels: Record<TopicCategory, string> = {
  "vc-startups": "VC & Startups",
  "fundraising-acquisitions": "Fundraising & Acquisitions",
  "executive-movements": "Executive Movements",
  "financial-markets": "Financial Markets",
  "geopolitics": "Geopolitics",
  "automotive": "Automotive",
  "science-tech": "Science & Tech",
  "local-news": "Local News",
  "politics": "Politics",
};

export const topicColors: Record<TopicCategory, string> = {
  "vc-startups": "bg-blue-100 text-blue-800",
  "fundraising-acquisitions": "bg-emerald-100 text-emerald-800",
  "executive-movements": "bg-purple-100 text-purple-800",
  "financial-markets": "bg-amber-100 text-amber-800",
  "geopolitics": "bg-red-100 text-red-800",
  "automotive": "bg-cyan-100 text-cyan-800",
  "science-tech": "bg-indigo-100 text-indigo-800",
  "local-news": "bg-orange-100 text-orange-800",
  "politics": "bg-rose-100 text-rose-800",
};

export function getRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}
