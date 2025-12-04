import { greetUser } from "packages/frontend/utils/greet";



window.Webflow ||= [];
window.Webflow.push(() => {
  const name = 'John Doe';
  greetUser(name);
});
