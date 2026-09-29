/**
 * What Mors leaves lying around the sandbox. Challenges send the user to
 * find, read, copy and search these, so paths and contents are part of
 * the practice content: change them together with tracks.ts.
 */

const lines = (...rows: string[]) => rows.join("\n") + "\n";

export const MORS_HOME = "/opt/mors";

export const MORS_FILES: Record<string, string> = {
  [`${MORS_HOME}/README.txt`]: lines(
    "You found my chamber. Good instincts.",
    "",
    "I'm Mors. Cyber-wizard, year 3026, technically dead. It's fine, I find it hilarious.",
    "I leave notes around this machine. Some are useful. Some are just notes.",
    "The useful ones tend to hide. Try: ls -a",
  ),
  [`${MORS_HOME}/notes/valdraak.txt`]: lines(
    "Valdraak, Ruler of the Slain, dropped by again.",
    "He tried the 'you cannot escape me' voice. I offered him tea.",
    "He does not understand that I already left. Death is a threshold, not a wall.",
  ),
  [`${MORS_HOME}/notes/threshold-walk.txt`]: lines(
    "Threshold Walking, field notes:",
    "1. A doorway is a liminal space. So is 3 a.m.",
    "2. Step through with intent. Arrive somewhere else.",
    "3. Works on filesystems too. cd is a threshold. Use it.",
  ),
  [`${MORS_HOME}/notes/bicycle.txt`]: lines(
    "Bicycle maintenance log",
    "- chain oiled",
    "- bell still rings in a frequency only ghosts hear",
    "- reminder: a wizard does not concern himself with employment, but he does concern himself with tyre pressure",
  ),
  [`${MORS_HOME}/notes/fear.txt`]: lines(
    "On fear: it is a prediction that your body makes before your mind gets a vote.",
    "Predictions can be wrong. I have been wrong about everything at least once.",
    "That is the entire method. Be wrong, measure, be less wrong.",
  ),
  [`${MORS_HOME}/.chamber/spellbook.txt`]: lines(
    "SPELLBOOK (do not read aloud near the kettle)",
    "fireball: heat, but with ambition",
    "frost: entropy, politely reversed",
    "lightning: 300,000,000 metres per second, give or take a lab",
    "threshold walk: see notes/threshold-walk.txt",
  ),
  [`${MORS_HOME}/.chamber/riddle.txt`]: lines(
    "A riddle, since you came all this way:",
    "I keep a record that grows but never remembers the future.",
    "Machines write to me while you sleep. Where am I?",
    "(The answer is a directory. Every system has one.)",
  ),
  [`${MORS_HOME}/.chamber/deathsight.log`]: lines(
    "deathsight v3026.4 — proximity readings",
    "subject=user reading=inconclusive note=still alive, impressively",
    "subject=valdraak reading=n/a note=he is the control group",
    "subject=mors reading=100% note=and yet",
  ),
  [`${MORS_HOME}/.chamber/threshold-walk.sh`]: lines(
    "#!/bin/bash",
    "# Steps through the nearest liminal space. Needs execute permission, like all good spells.",
    'echo "stepping through..."',
    'echo "arrived. probably."',
  ),
  "/var/log/mors.log": lines(
    "3026-01-01 00:00:01 INFO  consciousness compressed, 1000-year jump initiated",
    "2026-01-01 00:00:01 INFO  arrived. clock says 2026. clock is a construct.",
    "2026-01-01 00:00:02 WARN  threshold flicker detected near /tmp",
    "2026-01-01 00:00:03 INFO  found a bicycle",
    "2026-01-01 00:00:04 WARN  threshold flicker detected near /home/user",
    "2026-01-01 00:00:05 INFO  the riddle's answer: this directory",
  ),
  "/home/user/documents/from-mors.txt": lines(
    "Hello. I live in /opt/mors now. Rent is nothing; I'm dead.",
    "If you get stuck, type: mors help",
    "If you get curious, come visit.",
  ),
  "/tmp/.threshold": lines("a liminal space. nothing here yet. that's the point."),
};
