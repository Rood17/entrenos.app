# EntreNos App
React + TypeScript + Material UI, theme tokens in `src/theme/tokens.ts`, including light/dark/premium. Mobile-first preview of home, tasks, budget, profile, and pairing.
## Start
```sh
npm install
cp .env.example .env
npm run dev
npm run build
```
The home, tasks and finance views are explicitly demo data; they are not persisted. JWT login/registration and invitation creation can call the Django API. OAuth and persisted modules are future increments.
Brand logo paths are centralized in `src/theme/tokens.ts`. Copy the approved official asset files to `public/brand/` and confirm paths before production. No source brand binaries are in this scaffold.
