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

function executableTaskCount(): number {
  if (!existsSync(TASK_DIR)) return 0;
  return readdirSync(TASK_DIR)
    .map((entry) => join(TASK_DIR, entry))
    .filter((path) => statSync(path).isFile() && (statSync(path).mode & 0o111) !== 0)
    .length;
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
        <Bold>Agent-scoped Chromium automation with saved authentication.</Bold>
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
        Launch an agent-scoped browser, render a page, and save the current viewport as a PNG.
      </Paragraph>
      <CodeBlock lang="bash">{`browser launch
browser goto https://example.com
browser screenshot
browser close`}</CodeBlock>
      <Paragraph>
        The screenshot command prints a path under <Code>/tmp/browser-screenshots</Code>. Pass that path to an image-aware tool to inspect the rendered page.
      </Paragraph>
    </Section>

    <Section title="Move around the page">
      <Paragraph>
        Scroll the persistent browser by signed pixel deltas, then take another viewport screenshot. Ask for the entire scrollable page only when you need it.
      </Paragraph>
      <CodeBlock lang="bash">{`browser scroll --y 700
browser scroll --x 400 --y -200
browser screenshot
browser screenshot --full-page`}</CodeBlock>
    </Section>

    <Section title="Interact and inspect">
      <CodeBlock lang="bash">{`browser content 'main' --depth 2
browser wait '#results'
browser click 'button[type=submit]'
browser fill 'input[name=q]' 'browser automation'`}</CodeBlock>
      <Paragraph>
        Commands default to the agent's latest browser. Use <Code>--browser b-a1f3</Code> when several instances are running.
      </Paragraph>
    </Section>

    <Section title="Authenticated workflows">
      <Paragraph>
        Saved browser state is namespaced by agent and site. Login can use a supported automatic flow or a visible interactive browser.
      </Paragraph>
      <CodeBlock lang="bash">{`browser login github.com
browser launch
browser load-auth github.com
browser goto https://github.com/settings/profile
browser save-auth github.com`}</CodeBlock>
      <Paragraph>
        For a larger workflow, export a Playwright module and run it with <Code>browser run</Code>. See <Code>scripts/github-avatar-upload.mjs</Code> for the script contract.
      </Paragraph>
    </Section>

    <Section title="Development">
      <CodeBlock lang="bash">{`mise trust
mise install
mise run test
mise run doctor

# Optional clone-local safety net
codebase pre-commit`}</CodeBlock>
      <List>
        <Item>Public commands live in <Code>.mise/tasks</Code>.</Item>
        <Item>Browser actions live in <Code>scripts/_cdp.mjs</Code>.</Item>
        <Item>The public test task uses the KKL BATS fork and Rush to run isolated tests concurrently across and within files.</Item>
        <Item>CI checks Ubuntu, macOS, convention lints, and this generated README.</Item>
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
