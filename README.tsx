/** @jsxImportSource jsx-md */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

import {
  Badge,
  Badges,
  Bold,
  Center,
  Code,
  CodeBlock,
  Details,
  Heading,
  Item,
  LineBreak,
  Link,
  List,
  Paragraph,
  Section,
  Sub,
} from "readme";

const REPO_DIR = resolve(import.meta.dirname);
const TASK_DIR = join(REPO_DIR, ".mise/tasks");
const TEST_DIR = join(REPO_DIR, "test");
const WORKFLOW = join(REPO_DIR, ".github/workflows/test.yml");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function executableTaskCount(directory = TASK_DIR): number {
  if (!existsSync(directory)) return 0;

  let count = 0;
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      count += executableTaskCount(path);
    } else if (stat.isFile() && (stat.mode & 0o111) !== 0) {
      count += 1;
    }
  }
  return count;
}

function testCount(): number {
  if (!existsSync(TEST_DIR)) return 0;
  return readdirSync(TEST_DIR)
    .filter((entry) => entry.endsWith(".bats"))
    .map((entry) => read(join(TEST_DIR, entry)))
    .join("\n")
    .match(/@test\s+"/g)?.length ?? 0;
}

function configuredLints(): string[] {
  const source = read(join(REPO_DIR, "mise.toml"));
  const block = source.match(/\[_\.codebase\][\s\S]*?lint\s*=\s*\[([\s\S]*?)\]/)?.[1] ?? "";
  return [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function workflowOses(): string[] {
  if (!existsSync(WORKFLOW)) return [];
  const match = read(WORKFLOW).match(/os:\s*\[([^\]]+)\]/);
  return match?.[1].split(",").map((os) => os.trim()).filter(Boolean) ?? [];
}

const tasks = executableTaskCount();
const tests = testCount();
const lints = configuredLints();
const oses = workflowOses();

const readme = (
  <>
    <Center>
      <Heading level={1}>browser</Heading>
      <Paragraph>
        <Bold>Chromium automation with named profile storage.</Bold>
      </Paragraph>
      <Badges>
        <Badge label="tasks" value={`${tasks}`} color="blue" />
        <Badge label="tests" value={`${tests}`} color="brightgreen" href="test/" />
        <Badge label="CI" value={oses.join(" + ") || "pending"} color="4EAA25" />
        <Badge label="License" value="MIT" color="blue" href="LICENSE" />
      </Badges>
    </Center>

    <LineBreak />

    <Section title="Take a quick look">
      <Paragraph>
        Create a named profile, launch Chromium, and save the current viewport as a PNG.
      </Paragraph>
      <CodeBlock lang="bash">{`browser profile create rentals
id=$(browser launch --profile rentals --headed)
browser goto --browser "$id" https://example.com
browser screenshot --browser "$id"
browser close "$id"`}</CodeBlock>
      <Paragraph>
        The screenshot command prints a private PNG path under the instance registry's <Code>screenshots</Code> directory. Pass that path to an image-aware tool to inspect the rendered page.
      </Paragraph>
    </Section>

    <Section title="Move around the page">
      <Paragraph>
        Scroll the persistent browser by signed pixel deltas, then take another viewport screenshot. Ask for the entire scrollable page only when you need it.
      </Paragraph>
      <CodeBlock lang="bash">{`browser scroll --browser b-a1f3 --y 700
browser scroll --browser b-a1f3 --x 400 --y -200
browser screenshot --browser b-a1f3
browser screenshot --browser b-a1f3 --full-page`}</CodeBlock>
    </Section>

    <Section title="Interact and inspect">
      <CodeBlock lang="bash">{`browser content --browser b-a1f3 'main' --depth 2
browser wait --browser b-a1f3 '#results'
browser click --browser b-a1f3 'button[type=submit]'
browser fill --browser b-a1f3 'input[name=q]' 'browser automation'`}</CodeBlock>
      <Paragraph>
        Controls require an explicit browser ID. Use <Code>browser list</Code> to find managed instances. <Code>browser close-all --all</Code> explicitly closes every instance in this user's registry.
      </Paragraph>
    </Section>

    <Section title="Named profiles">
      <CodeBlock lang="bash">{`browser profile create rentals
browser profile list`}</CodeBlock>
      <Paragraph>
        A profile starts as an empty, private Chromium data directory. Browsing updates it automatically; persistent cookies, storage, and preferences survive clean restarts. Sites can expire logins, and session-only cookies may not survive a restart. No Git identity or account inference is used.
      </Paragraph>
      <Paragraph>
        Profiles live under <Code>~/.local/share/browser/profiles/NAME/data</Code>. Set <Code>BROWSER_PROFILES_DIR</Code> to choose a different profile-storage root. Profile names start with a letter or digit and contain only letters, digits, underscores, and hyphens.
      </Paragraph>
      <Paragraph>
        Launch with <Code>--profile NAME</Code> or <Code>--temporary</Code>, never an implicit default. A profile can be used by only one managed instance at a time, including concurrent launches. Temporary browser data is removed on clean close. Use <Code>profile fork SOURCE DESTINATION</Code> to copy a closed profile into a new independent one.
      </Paragraph>
    </Section>

    <Section title="Fork a closed baseline">
      <CodeBlock lang="bash">{`browser profile create zillow
id=$(browser launch --profile zillow --headed)
# Log in in that window, then close it cleanly.
browser close "$id"

browser profile fork zillow research-1
browser profile fork zillow research-2
browser launch --profile research-1 --headed
browser launch --profile research-2 --headed`}</CodeBlock>
      <Paragraph>
        Each fork starts with the baseline's browser data and evolves independently. The source must be closed and the destination must not exist. Both names are reserved during copying, and incomplete data is never exposed as a launchable profile. A failed or canceled copy removes its partial destination.
      </Paragraph>
      <Paragraph>
        Forks are full local copies, not immutable snapshots or portable auth bundles. They include sensitive session state and may use substantial disk space. Symlinks, special files, and remaining Chromium locks are refused. Ordinary interruption requests cleanup; a file copy already in progress may need to finish first. Abrupt process kills can leave reservations for manual recovery.
      </Paragraph>
      <Paragraph>
        Local isolation is not account isolation: forks logged into the same Zillow account still share server-side changes such as saved listings. Login expiry and cross-machine portability remain site- and platform-dependent.
      </Paragraph>
    </Section>

    <Section title="Scripted workflows">
      <Paragraph>
        Export a Playwright module whose default function receives <Code>{"{ page, context, browser, args }"}</Code>. Run it in a fresh temporary browser, or attach to a running instance to use that browser's current session.
      </Paragraph>
      <CodeBlock lang="bash">{`browser run /path/to/research.mjs
browser run --browser b-a1f3 /path/to/research.mjs`}</CodeBlock>
      <Paragraph>
        Attached runs leave the browser running. Temporary runs close their browser afterward. Scripts are imported once, and no site metadata or saved-auth files are consulted. See <Code>scripts/workflows/github-avatar-upload.mjs</Code> for an example; it requires an already logged-in browser.
      </Paragraph>
      <Paragraph>
        Saved-auth commands (<Code>login</Code>, <Code>save-auth</Code>, <Code>load-auth</Code>, and auth <Code>status</Code>) and <Code>run --site</Code> have been removed. Old snapshot files remain untouched on disk but are no longer loaded or updated. Log in manually in a headed named profile; its state persists on close.
      </Paragraph>
    </Section>

    <Section title="Lifecycle and recovery">
      <Paragraph>
        Instance records live under <Code>~/.local/state/browser/instances</Code>, or <Code>BROWSER_RUNTIME_DIR</Code>. A detached worker owns each Chromium context. Closing uses CDP for a graceful shutdown, not a blind PID signal. Old process records and saved logins are not adopted.
      </Paragraph>
      <Paragraph>
        Each active browser or fork operation has private <Code>running.json</Code> reservations on the profiles it owns. Workers release reservations after Chromium exits; forks release them after publication or cleanup. An abruptly killed worker may leave a reservation; launches then refuse rather than risk concurrent writes. Automatic crash recovery is not implemented. Verify that the reservation's owner process has stopped and no Chromium process uses that data directory before manually removing a stale reservation. Profiles and instance records are private session data, not Git artifacts.
      </Paragraph>
    </Section>

    <Section title="Development">
      <CodeBlock lang="bash">{`mise trust
mise install
mise run setup
mise run test
mise run doctor

# Optional clone-local safety net
codebase pre-commit`}</CodeBlock>
      <List>
        <Item>Public commands live in <Code>.mise/tasks</Code>.</Item>
        <Item>Browser actions live in <Code>scripts/_cdp.mjs</Code>.</Item>
        <Item>The public test task uses the KKL BATS fork and Rush to run isolated tests concurrently across and within files.</Item>
        <Item>Real Chromium lifecycle tests cover persistent cookies, temporary isolation, and simultaneous profile launches. Install Chromium with <Code>mise run setup</Code>; CI installs it on Ubuntu and macOS.</Item>
        <Item>CI also checks convention lints and this generated README.</Item>
      </List>
    </Section>

    <Details summary="Current repository health">
      <Paragraph>
        {`This checkout exposes ${tasks} public tasks and ${tests} BATS tests, with this configured convention lint portfolio.`}
      </Paragraph>
      <CodeBlock>{lints.join("\n")}</CodeBlock>
    </Details>

    <Center>
      <Sub>
        Generated from <Code>README.tsx</Code> with <Link href="https://github.com/KnickKnackLabs/readme">KnickKnackLabs/readme</Link>.
      </Sub>
    </Center>
  </>
);

console.log(readme);
