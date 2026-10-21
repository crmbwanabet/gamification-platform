// npm run contract:check — is our copy of the Wheel <-> Bonus Center contract
// identical to the one on crmbwanabet/wheel-of-fortune's main branch? Uses the gh CLI (logged in).
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const PATH = 'docs/integrations/wheel-bonus-center-contract.json';
const OTHER = 'crmbwanabet/wheel-of-fortune';
const ours = readFileSync(new URL(`../${PATH}`, import.meta.url), 'utf8');
let theirs;
try {
  const b64 = execFileSync('gh', ['api', `repos/${OTHER}/contents/${PATH}?ref=main`, '--jq', '.content'], { encoding: 'utf8' });
  theirs = Buffer.from(b64.replace(/\s/g, ''), 'base64').toString('utf8');
} catch (e) {
  console.error(`Could not read ${PATH} from ${OTHER} (not pushed yet, or gh not logged in).`);
  process.exit(2);
}
const norm = (s) => s.replace(/\r\n/g, '\n');
if (norm(ours) === norm(theirs)) {
  console.log(`Contract matches ${OTHER} (version ${JSON.parse(ours).version}).`);
} else {
  console.error(`Contract DIFFERS from ${OTHER}: ours v${JSON.parse(ours).version}, theirs v${JSON.parse(theirs).version}. Copy the newer one into both repos.`);
  process.exit(1);
}
