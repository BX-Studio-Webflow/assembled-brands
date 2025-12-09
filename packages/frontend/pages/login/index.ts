import { queryElement } from '$utils/selectors';

console.log('Logidvsn page');
const form = document.querySelector('[dev-target="login-form"]');
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = queryElement<HTMLInputElement>('input[name="email"]', form!);
  const password = queryElement<HTMLInputElement>(
    '[dev-target="login-form"] input[name="password"]'
  );
  console.log(email, password);
});
