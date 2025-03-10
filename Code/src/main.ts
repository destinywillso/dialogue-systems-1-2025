import "./style.css";
import typescriptLogo from "./typescript.svg";
import viteLogo from "/vite.svg";
<<<<<<< HEAD
import { setupButton } from "./dm4.js";
=======
import { setupButton } from "./dm.ts";
>>>>>>> 59cecbb90cd1cb7c68def12d975a13243584e990

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
  </div>
`;

setupButton(document.querySelector<HTMLButtonElement>("#counter")!);
