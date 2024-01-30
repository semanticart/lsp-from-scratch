import { spawnSync } from "child_process";
import log from "./log";

export const spellingSuggestions = (
  content: string
): Record<string, string[]> => {
  /*
@(#) International Ispell Version 3.1.20 (but really Aspell 0.60.8.1)
& helllo 34 0: hello, hell, he'll, Heller, halloo, hell lo, hell-lo, hellos, jello, hallow, hollow, hellion, Hall, Hill, Hull, hall, halo, heal, heel, hill, hull, cello, Holly, hilly, holly, hell's, Halley, Hallie, Holley, Hollie, healer, holler, huller, hello's
*
& sallly 38 14: Sally, sally, silly, sully, Sallie, sallow, slay, Sal, dally, sly, ally, Saul, sail, sale, sell, sill, sadly, salty, slyly, allay, alley, alloy, bally, pally, rally, tally, wally, Sulla, surly, safely, sagely, salary, sanely, sawfly, smelly, solely, Sally's, sally's
*
*
# kfljdslkfjdslkjfds 32
*/

  const invalidWordsAndSuggestions: Record<string, string[]> = {};

  const allOutput = spawnSync("aspell", ["pipe"], {
    input: content,
    encoding: "utf-8",
  })
    .stdout.trim()
    .split("\n");

  log.write({ allOutput });

  allOutput.forEach((line) => {
    const prefix = line.slice(0, 1);

    switch (prefix) {
      case "&":
        // handle good suggestion
        // & sallly 38 14: Sally, sally, silly, sully, Sallie, sallow, slay, Sal, dally, sly, ally, Saul, sail, sale, sell, sill, sadly, salty, slyly, allay, alley, alloy, bally, pally, rally, tally, wally, Sulla, surly, safely, sagely, salary, sanely, sawfly, smelly, solely, Sally's, sally's
        const suggestionMatch = line.match(/^& (.*?) \d.*: (.*)$/);

        if (!suggestionMatch) {
          log.write({ spellingSuggestions: { invalidMatch: line } });
          return;
        }

        invalidWordsAndSuggestions[suggestionMatch[1]] =
          suggestionMatch[2].split(", ");
        break;
      case "#":
        // handle invalid
        // # kfljdslkfjdslkjfds 32
        const match = line.match(/^# (.*?) \d/);

        if (!match) {
          log.write({ spellingSuggestions: { invalidMatch: line } });
          return;
        }

        invalidWordsAndSuggestions[match[1]] = [];
        break;
    }
  });

  return invalidWordsAndSuggestions;
};
