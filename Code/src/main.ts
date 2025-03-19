import "./style.css";
<<<<<<< HEAD
import typescriptLogo from "./typescript.svg";
import viteLogo from "/vite.svg";
=======
>>>>>>> 953292c (revise)
import { setupButton } from "./dm.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
  </div>
`;

setupButton(document.querySelector<HTMLButtonElement>("#counter")!);
