# Savant - Product Requirements Document (PRD)

## Document Info
- **Version**: 1.0
- **Last Updated**: December 2024
- **Status**: Planning

---

## 1. Executive Summary

**Savant** is a bot creation platform that enables users to build, train, and deploy AI-powered assistants ("Savants") with their own knowledge bases. Each Savant is an AI agent with:
- Its own vector store for RAG (Retrieval-Augmented Generation)
- Customizable system prompts
- Configurable LLM settings
- Future: Multi-agent connections and tool integrations

### North Star
[Relevance AI](https://relevanceai.com/) - A platform where users can build AI agents in seconds, give them tools and knowledge, and deploy them for various use cases.

---

## 2. Problem Statement

### Current Pain Points
1. **Complexity**: Building custom AI assistants requires deep technical knowledge
2. **Data Silos**: Users can't easily bring their own data to train AI
3. **Lack of Customization**: Generic chatbots don't adapt to specific business needs
4. **Scalability**: Self-hosted solutions are hard to scale
5. **Cost**: Enterprise solutions are prohibitively expensive for small teams

### Target Users
- **Primary**: Small-to-medium businesses wanting AI assistants for customer support, internal knowledge bases, sales assistance
- **Secondary**: Developers and agencies building AI solutions for clients
- **Tertiary**: Enterprise teams needing customizable AI workflows

---

## 3. Product Vision

### Value Proposition
"Create AI assistants trained on YOUR data in minutes, not months."

### Key Differentiators
1. **Per-Savant Vector Stores**: Complete data isolation between bots
2. **Multi-tenant by Design**: Enterprise-grade security with RLS
3. **Hierarchical Prompts**: Account-level + bot-level prompt management
4. **Future-Ready**: Architecture supports multi-agent workflows and tool integrations

---

## 4. Feature Requirements

### MVP (Phase 1)

#### 4.1 User Authentication
| Feature | Priority | Description |
|---------|----------|-------------|
| Email signup/login | P0 | Basic auth via Supabase |
| OAuth (Google) | P0 | Social login |
| Account creation | P0 | Auto-create account on first login |
| Team invitations | P2 | Invite team members (post-MVP) |

#### 4.2 Savant Management
| Feature | Priority | Description |
|---------|----------|-------------|
| Create Savant | P0 | Name, description, model selection |
| Update Savant | P0 | Edit settings, prompt, model config |
| Delete Savant | P0 | Soft delete with data cleanup |
| List Savants | P0 | Dashboard view of all Savants |
| Savant Settings | P0 | System prompt, temperature, max tokens |

#### 4.3 Document Management
| Feature | Priority | Description |
|---------|----------|-------------|
| Upload documents | P0 | PDF, DOCX, TXT, MD support |
| Processing status | P0 | Show chunking/embedding progress |
| Delete documents | P0 | Remove with associated vectors |
| Document preview | P1 | View uploaded content |

#### 4.4 Chat Interface
| Feature | Priority | Description |
|---------|----------|-------------|
| Send messages | P0 | User input |
| Streaming responses | P0 | Real-time token display |
| RAG retrieval | P0 | Context from vector store |
| Conversation history | P1 | Persist and display history |
| Stop generation | P1 | Cancel streaming response |

#### 4.5 Prompt Management
| Feature | Priority | Description |
|---------|----------|-------------|
| Bot system prompt | P0 | Per-Savant customization |
| Account default prompt | P1 | Applied to all Savants |
| Prompt overrides | P1 | Priority-based resolution |

#### 4.6 Brand Voice
| Feature | Priority | Description |
|---------|----------|-------------|
| Trait-based generation | P0 | Select 2-10 personality traits, AI generates system prompt |
| Simple mode | P0 | Quick trait selection with custom notes |
| Advanced mode | P1 | Comprehensive brand context with 3 sections |
| Business information | P1 | Company details, category, ideal customer |
| Website analysis | P1 | Auto-extract business info from URL using Firecrawl + AI |
| Brand identity | P1 | Pillars, differentiators, messaging restrictions |
| Voice dimensions | P1 | 7 "This vs That" spectrums (casual/formal, etc.) |
| Quick-select presets | P1 | Common options for faster form completion |
| Onboarding integration | P1 | Tour step highlighting advanced options |

**Brand Voice Details:**

Users can define their brand's personality to ensure consistent communication across all Savants.

**Simple Mode:**
- Select from 10 personality traits: Cheerful, Agreeable, Social, Gen Z, Funny, Realistic, Formal, Empathetic, Concise, Detailed
- Add custom notes for additional context
- AI generates a 2-3 paragraph system prompt automatically using Claude Haiku 4.5

**Advanced Mode:**
- **Business Information**: Company name, website URL, business description, primary category (9 options), locations, ideal customer
  - **Website Analysis**: Enter URL and click "Analyze" to auto-extract business info using Firecrawl API + AI extraction
  - Quick-select presets for locations (USA, Global, Europe, Asia-Pacific) and customer types (B2B, B2C, Enterprise, SMB, Startups)
- **Brand Identity**: Brand pillars (multi-select with presets), voice description, differentiators, past campaign learnings, messaging restrictions
  - Voice style presets: Professional, Friendly, Expert, Warm, Bold
- **Voice Dimensions**: 7 spectrums with A/B/Neither options
  - Casual vs Formal, Playful vs Serious, Polished vs Gritty, Warm vs Cool, Classic vs Trendy, Expert vs Insider, Laid-back vs Bold
  - Optional notes for each dimension

**Technical Implementation:**
- Powered by Claude Haiku 4.5 via OpenRouter API
- Website scraping via Firecrawl API (optional, 500 free credits/month)
- AI extraction of structured business data from website content
- Stored in `account_prompts` table with JSONB for flexibility (`brand_voice_traits` field)
- Applied to all Savants in the account with priority-based system (priority: 100)
- Expandable UI with completion tracking (X/3 sections)

### Future Phases

#### Phase 2 - Advanced Features
- Savant-to-Savant connections (multi-agent)
- Tool integrations (via MCP/Composio)
- API access for external applications
- Embeddable chat widgets

#### Phase 3 - Enterprise
- Team workspaces with RBAC
- Usage analytics dashboard
- Custom model integrations
- Audit logs and compliance

---

## 5. Technical Requirements

### Performance
| Metric | Target |
|--------|--------|
| Chat latency (TTFB) | < 500ms |
| Document processing | < 30s for 10-page PDF |
| Vector search | < 100ms |
| Page load | < 2s |

### Scalability
- Support 1,000+ concurrent users
- Handle 10,000+ Savants per account
- Store 1M+ vector embeddings per account

### Security
- Row Level Security (RLS) on all tables
- JWT-based authentication (Supabase + AgentOS RBAC)
- Encrypted data at rest and in transit
- No data leaves user's control (AgentOS principle)

---

## 6. User Flows

### 6.1 New User Onboarding
```
Landing → Sign Up → Create Account → Create First Savant → Upload Document → Start Chat
```

### 6.2 Document Training
```
Select Savant → Upload Documents → Wait for Processing → View Chunks → Test with Chat
```

### 6.3 Chatting with Savant
```
Open Savant → Enter Message → Retrieve RAG Context → Stream Response → Display Answer
```

---

## 7. Success Metrics

### Launch Metrics
| Metric | Target (M1) | Target (M3) |
|--------|-------------|-------------|
| Registered users | 100 | 1,000 |
| Active Savants | 200 | 5,000 |
| Documents uploaded | 500 | 10,000 |
| Daily active users | 50 | 500 |

### Engagement Metrics
| Metric | Target |
|--------|--------|
| Avg. messages per user/day | 10+ |
| Savants per user | 2-3 |
| Documents per Savant | 5-10 |
| User retention (D7) | 40% |

---

## 8. Dependencies

### External Services
| Service | Purpose | Risk Level |
|---------|---------|------------|
| Supabase | Auth, DB, Storage | Low |
| OpenAI | LLM, Embeddings | Medium |
| OpenRouter | Claude API access for brand voice | Low |
| Firecrawl | Website scraping (optional) | Low |
| Stripe | Payments | Low |
| Autumn | Usage billing | Low |
| Vercel | Frontend hosting | Low |

### Technical Dependencies
| Component | Technology |
|-----------|------------|
| Frontend | Next.js 15, React, Tailwind |
| Backend | Agno AgentOS (FastAPI) |
| Database | PostgreSQL + pgvector |
| Hosting | Vercel + Railway/Render |

---

## 9. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| OpenAI rate limits | High | Medium | Implement queuing, fallback to other providers |
| Vector DB performance | High | Low | pgvector benchmarks are solid, HNSW indexing |
| User data privacy | Critical | Low | RLS, AgentOS privacy-first, all data local |
| Agno framework changes | Medium | Low | Abstraction layer for migration |
| Cost overruns | Medium | Medium | Usage limits per tier, Autumn tracking |

---

## 10. Release Plan

### Alpha (Week 1-4)
- Core authentication
- Savant CRUD
- Basic chat (no RAG)

### Beta (Week 5-8)
- Document upload/processing
- RAG integration
- Streaming responses
- Account prompts

### V1.0 (Week 9-12)
- Polish and bug fixes
- Performance optimization
- Billing integration (Stripe + Autumn)
- Launch

---

## 11. Open Questions

1. **Embedding model**: OpenAI ada-002 (1536 dims) or smaller model?
2. **Chunk size**: Default 1000 chars with 200 overlap - configurable per Savant?
3. **Free tier limits**: How many Savants, documents, messages?
4. **Model selection**: OpenAI only or also Anthropic, Google from start?
5. **Public Savants**: Allow sharing bots publicly?

---

## Appendix

### A. Competitive Analysis
| Competitor | Strengths | Weaknesses |
|------------|-----------|------------|
| Relevance AI | Full-featured, multi-agent | Complex, enterprise-focused |
| Chatbase | Simple, quick setup | Limited customization |
| CustomGPT | GPT-focused | No multi-model support |
| Voiceflow | Visual builder | Learning curve |

### B. Glossary
- **Savant**: An AI bot with its own knowledge base and settings
- **RAG**: Retrieval-Augmented Generation - using vector search to add context
- **RLS**: Row Level Security - database-level access control
- **AgentOS**: Agno's production runtime for AI agents
