---
name: personalized-outreach
description: Generate 1:1 personalized video for sales prospecting and customer success
version: 1.0.0
---

# Personalized Outreach Video Generation

## When to Use
- Sales prospecting — send personalized video to leads
- Customer onboarding — welcome video with account-specific details
- Customer success — renewal/upsell with usage highlights

## Template: personalized-outreach-v1

### Scene Structure
1. **Personalized Greeting** (3s): "Hi [First Name]" with their company logo
2. **Context** (5s): Reference to their specific pain point or recent activity
3. **Solution** (8s): How your product solves their specific problem
4. **Social Proof** (4s): Case study from similar company/industry
5. **CTA** (3s): "Book a call" or specific next step

### Data Bindings
- `prospect_name`: String (first name)
- `company_name`: String
- `company_logo_url`: URL (optional)
- `pain_point`: String (specific to prospect)
- `solution_pitch`: String (tailored value prop)
- `case_study`: { company, result, metric }
- `cta_text`: String
- `cta_url`: String (calendar link, demo link, etc.)

### Personalization Rules
- Always use first name, never full name
- If company logo unavailable, use company name as text
- Match industry vertical in social proof scene
- Keep under 30 seconds — shorter is better for cold outreach
- A/B test: direct CTA vs. soft CTA ("interested?" vs. "book now")
