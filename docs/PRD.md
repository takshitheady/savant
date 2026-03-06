# Savant - Product Requirements Document (PRD)

## Document Info
- **Version**: 2.0
- **Last Updated**: March 2026
- **Status**: Active Development

## Recent Updates (March 2026)

### Admin-Only Store Model (NEW)

**Platform Model Change:**
- Savant is now an **admin-curated AI assistant marketplace**
- Only platform admins (Heady team) can create and publish savants
- Normal users browse the store, import savants, and customize with their own data
- Admin base prompts and knowledge bases are hidden from end users

**Previous Updates (January 2025):**
- ✅ Password Reset Flow - Complete email-based password reset with OTP verification
- ✅ Auth Callback Security - Fixed open redirect vulnerability, added error handling
- ✅ Savant Creation Form - Fixed validation for optional fields
- ✅ RAG accuracy improvements - Agent now uses exact document content

---

## 1. Executive Summary

**Savant** is an admin-curated AI assistant marketplace. Platform admins (Heady team) build, train, and publish AI-powered assistants ("Savants") with hidden knowledge bases and base instructions. End users browse the store, import savants into their account, and customize them with their own instructions and documents.

Each Savant is an AI agent with:
- A hidden admin knowledge base (RAG) that powers its expertise
- Hidden base system prompts that define its core behavior
- User-customizable instructions layered on top
- User-uploadable documents for personalization
- Configurable LLM settings

### North Star
**Shopify App Store meets ChatGPT** - A curated marketplace of pre-built, expert AI assistants that users can import and customize for their specific business needs.

---

## 2. Problem Statement

### Current Pain Points
1. **Complexity**: Building useful AI assistants from scratch requires prompt engineering expertise
2. **Cold Start**: Users don't know what instructions to give an AI to make it useful
3. **Quality Control**: User-created bots are inconsistent in quality
4. **IP Protection**: Platform creators need to protect their prompt engineering and curated knowledge
5. **Customization**: Users still need to personalize AI for their specific context

### User Roles

#### Platform Admins (Heady Team)
- Create savants from scratch with expert-crafted prompts
- Upload curated knowledge bases (hidden from end users)
- Publish savants to the store with descriptions, categories, and tags
- Push updates to all users who imported a savant
- Manage store listings, categories, and featured items

#### End Users (Customers)
- Browse the store to discover pre-built savants
- Import savants into their account
- Customize imported savants with their own instructions
- Upload their own documents to personalize the savant
- Chat with savants
- Cannot create savants from scratch
- Cannot see admin base prompts or admin knowledge base documents

---

## 3. Product Vision

### Value Proposition
"Expert AI assistants, ready to use. Customize with your data in minutes."

### Key Differentiators
1. **Admin-Curated Quality**: Every savant is expert-crafted by the Heady team
2. **Hidden IP Protection**: Admin prompts and knowledge bases are invisible to users
3. **Easy Customization**: Users add their own instructions and documents on top
4. **Per-Savant Vector Stores**: Complete data isolation between bots
5. **Update Push**: Admin improvements automatically available to all users

---

## 4. Feature Requirements

### 4.1 User Roles & Permissions

#### Platform Admin (Heady Team)
| Feature | Priority | Status | Description |
|---------|----------|--------|-------------|
| Create savants | P0 | ✅ Complete | Full savant creation with name, prompts, model config |
| Upload admin documents | P0 | ✅ Complete | Hidden knowledge base (invisible to end users) |
| Write base system prompts | P0 | ✅ Complete | Hidden base instructions |
| Publish to store | P0 | 🔧 Building | List savant in marketplace with category, tags, description |
| Push updates | P1 | 🔜 Planned | Update template, notify users of new version |
| Manage store | P1 | 🔜 Planned | Feature savants, manage categories, moderate reviews |
| Brand voice (admin) | P0 | ✅ Complete | Define brand personality applied to all savants |

#### End User (Customer)
| Feature | Priority | Status | Description |
|---------|----------|--------|-------------|
| Browse store | P0 | ✅ Complete | Discover savants by category, search, featured |
| Import savant | P0 | ✅ Complete | Clone savant to own account |
| Add custom instructions | P0 | ✅ Complete | Layer own prompts on top of hidden base |
| Upload own documents | P0 | ✅ Complete | Add personal knowledge base |
| Chat with savants | P0 | ✅ Complete | Streaming chat with RAG |
| Receive updates | P1 | 🔜 Planned | Notification when admin pushes new version |
| Cannot create savants | P0 | 🔧 Building | No "Create Savant" button in UI |
| Cannot see admin prompts | P0 | 🔧 Building | Base prompts hidden from settings |
| Cannot see admin docs | P0 | 🔧 Building | Admin documents hidden from document list |

### 4.2 What Users See vs What's Hidden

```
VISIBLE TO USER                       HIDDEN FROM USER
-----------------                     -----------------
Savant name & description             Base system prompt (admin-written)
Their own custom instructions         Admin knowledge base documents
Their own uploaded documents          Admin document chunks in RAG results
Chat interface                        Model config details
Store listing info                    Internal prompt hierarchy
"Update available" badge              How updates are pushed
```

### 4.3 Authentication
| Feature | Priority | Status | Description |
|---------|----------|--------|-------------|
| Email signup/login | P0 | ✅ Complete | Basic auth via Supabase |
| OAuth (Google) | P0 | ✅ Complete | Social login |
| Account creation | P0 | ✅ Complete | Auto-create account on first login |
| Password reset | P0 | ✅ Complete | Email-based password reset with OTP |
| Admin role check | P0 | 🔧 Building | `platform_admins` table for admin verification |

### 4.4 Store & Marketplace
| Feature | Priority | Status | Description |
|---------|----------|--------|-------------|
| Store categories | P0 | ✅ Complete | 10 categories seeded |
| Store listings | P0 | ✅ Complete | Savant cards with description, tags, ratings |
| Import flow | P0 | ✅ Complete | One-click import to user account |
| Search & filter | P1 | ✅ Complete | By category, tags, popularity |
| Featured savants | P1 | ✅ Complete | Admin-promoted listings |
| Reviews & ratings | P2 | ✅ Complete | User feedback on imported savants |

### 4.5 Document Management
| Feature | Priority | Description |
|---------|----------|-------------|
| Admin document upload | P0 | Hidden knowledge base for savant templates |
| User document upload | P0 | PDF, DOCX, TXT, MD support |
| Processing status | P0 | Show chunking/embedding progress |
| Document visibility | P0 | Admin docs hidden, user docs visible |
| RAG filtering | P0 | Admin docs used in RAG but not shown in UI |

### 4.6 Chat Interface
| Feature | Priority | Description |
|---------|----------|-------------|
| Send messages | P0 | User input |
| Streaming responses | P0 | Real-time token display |
| RAG retrieval | P0 | Context from both admin + user documents |
| Conversation history | P1 | Persist and display history |
| Stop generation | P1 | Cancel streaming response |

### 4.7 Brand Voice (Admin Only)
| Feature | Priority | Description |
|---------|----------|-------------|
| Trait-based generation | P0 | Select 2-10 personality traits, AI generates system prompt |
| Simple mode | P0 | Quick trait selection with custom notes |
| Advanced mode | P1 | Business info, brand identity, voice dimensions |
| Website analysis | P1 | Auto-extract business info from URL using Firecrawl + AI |

Brand voice is configured by admins and applied across all savants in the account. End users do not configure brand voice.

### Future Phases

#### Phase 2 - Advanced Features
- Savant-to-Savant connections (multi-agent)
- Tool integrations (via MCP/Composio)
- API access for external applications
- Embeddable chat widgets
- Version history for savant templates

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

### 6.1 Admin: Create & Publish Savant
```
Login (admin) → Create Savant → Write Base Prompt → Upload Knowledge Base →
Test in Chat → Publish to Store (category, tags, description)
```

### 6.2 Admin: Push Update to Users
```
Edit Savant → Update Prompt/Docs → Push Update → Users See "Update Available" Badge →
User Clicks Upgrade → Savant Updated (preserves user customizations)
```

### 6.3 End User: Onboarding
```
Landing → Sign Up → Browse Store → Import First Savant → (Optional) Add Instructions →
(Optional) Upload Documents → Start Chat
```

### 6.4 End User: Customize Imported Savant
```
My Savants → Select Savant → Settings → Add Custom Instructions → Upload Own Documents →
Test in Chat
```

### 6.5 End User: Chat with Savant
```
Open Savant → Enter Message → RAG retrieves from admin + user docs →
Stream Response → Display Answer
```

### 6.6 What the User Dashboard Looks Like

```
+---------------------------------------+
|  My Savants                           |
|                                       |
|  [Sales Assistant] (from Store)       |
|     Your instructions: "Focus on..."  |
|     Your docs: company-pitch.pdf      |
|     [Update available v2]             |
|                                       |
|  [Support Bot] (from Store)           |
|     Your instructions: (none)         |
|     Your docs: faq.docx              |
|                                       |
|  [+ Browse Store]                     |
|                                       |
|  (No "Create Savant" button)          |
+---------------------------------------+
```

---

## 7. Success Metrics

### Launch Metrics
| Metric | Target (M1) | Target (M3) |
|--------|-------------|-------------|
| Registered users | 100 | 1,000 |
| Store savants published | 10 | 50 |
| Savant imports | 200 | 5,000 |
| Daily active users | 50 | 500 |

### Engagement Metrics
| Metric | Target |
|--------|--------|
| Avg. messages per user/day | 10+ |
| Savants imported per user | 2-3 |
| User docs per Savant | 3-5 |
| User retention (D7) | 40% |
| Import-to-chat conversion | 70% |

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

1. **Embedding model**: OpenAI ada-002 (1536 dims) or smaller model? → Using ada-002
2. **Chunk size**: Default 1000 chars with 200 overlap - configurable per Savant? → Default for now
3. **Free tier limits**: How many savant imports, documents, messages?
4. **Model selection**: OpenAI only or also Anthropic, Google from start? → OpenAI default, OpenRouter for flexibility
5. ~~**Public Savants**: Allow sharing bots publicly?~~ → Resolved: Admin-only store model
6. **Update push**: When admin updates a template, auto-push or let users choose?
7. **Initial admin account**: Which user account(s) should be the initial platform admins?
8. **Existing store listings**: What to do with any pre-existing user-created listings?

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
- **Savant**: An AI assistant with its own knowledge base and settings
- **Template Savant**: An admin-created savant published to the store
- **Imported Savant**: A user's copy of a template savant, with their customizations
- **Admin Documents**: Hidden knowledge base uploaded by admins (invisible to users)
- **User Documents**: Documents uploaded by end users to personalize their savant
- **Base Prompt**: Admin-written system prompt (hidden from users)
- **Custom Instructions**: User-added instructions layered on top of base prompt
- **Platform Admin**: Heady team member with full savant creation and store management access
- **End User**: Customer who browses store, imports savants, and customizes them
- **RAG**: Retrieval-Augmented Generation - using vector search to add context
- **RLS**: Row Level Security - database-level access control
- **AgentOS**: Agno's production runtime for AI agents
