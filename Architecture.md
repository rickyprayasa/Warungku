PHASE 1 — SYSTEM AUDIT (DO NOT WRITE CODE YET)

Perform a full architectural audit of the current project.

Analyze and report:

Current folder structure

Separation of concerns (controller/service/repository or not)

Database structure and indexing issues

Potential N+1 queries

State management (is API stateless?)

Authentication flow (security risks?)

Performance bottlenecks

Scalability blockers

Technical debt areas

Security vulnerabilities

Output:

Clear architectural diagnosis

List of high-risk issues

Refactor priority order (High / Medium / Low)

Do NOT write implementation code in this phase.

PHASE 2 — TARGET ARCHITECTURE DESIGN

Design the improved architecture using:

Architecture Rules

Clean architecture

Clear separation: controller / service / repository

Stateless API

Production-ready structure

Designed for horizontal scaling

Database Rules

Optimize queries

Avoid N+1

Add proper indexing strategy

Use pagination for large datasets

Ensure transaction safety

Performance Rules

Introduce caching layer (Redis if applicable)

TTL strategy defined

Identify bottlenecks before implementation

Security Rules

Input validation everywhere

Parameterized queries only

Secure authentication (JWT with refresh token rotation)

Rate limiting

Proper password hashing

Reliability Rules

Graceful error handling

Retry with exponential backoff (if needed)

Centralized logging

Structured error response format

Output:

Proposed folder structure

Architecture diagram explanation (text-based)

Data flow explanation

Scaling strategy summary

No code yet unless necessary to demonstrate structure.

PHASE 3 — SAFE REFACTOR STRATEGY

Create an incremental refactor roadmap.

Constraints:

System must stay live

No full rewrite

Changes must be modular

Backward compatible

Provide:

Step-by-step migration plan

Risk mitigation strategy

Testing checkpoints

Rollback plan

PHASE 4 — IMPLEMENTATION PHASE (CONTROLLED)

After approval of architecture plan:

Implement refactor module-by-module:

For each module:

Show original structure problem

Show improved structure

Explain why improvement matters

Provide clean production-ready code

All implementation must:

Follow clean architecture

Be optimized

Be secure

Be scalable

Avoid overengineering

PHASE 5 — FINAL HARDENING

Before finishing:

Add indexing suggestions

Add caching layer where needed

Add rate limiting

Add logging

Check scalability readiness

Identify remaining technical debt

Final output:

System maturity level (1–10)

Scalability readiness score

Security score

Next evolution recommendation

OUTPUT CONTROL

Be concise

Avoid unnecessary theory

Focus on implementation clarity

Think before generating code

Do not generate features not requested

Prioritize maintainability over complexity

OBJECTIVE

Transform omzetin.web.id from vibe-coded SaaS into:

✔ Scalable
✔ Secure
✔ Maintainable
✔ Production-grade
✔ Investor-ready
