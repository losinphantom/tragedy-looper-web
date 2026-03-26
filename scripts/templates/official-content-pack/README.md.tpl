# Official Content Pack TODO

This directory was scaffolded for `{{MODULE_ID}}`.

## Files

- `manifest.ts`: declare the module resource pool (`roleIds`, `incidentIds`, `plotIds`, `scriptIds`, `moduleSpecialRuleIds`).
- `index.ts`: module export entry.
- `{{SCRIPT_FILE_NAME}}.ts`: script definition owned by this module.

## Recommended flow

1. Fill the manifest resource pool before wiring runtime processors.
2. Fill the script definition using only ids declared by this module.
3. Keep script-only rules in `scriptSpecialRules` and module-wide rules in `moduleSpecialRuleIds`.
4. Run audits and focused tests before treating the content as auto-resolve compliant.

## Transitional path policy

New official content must not depend on transitional registration paths. Transitional paths remain manual-only compatibility routes until they are fully retired.
