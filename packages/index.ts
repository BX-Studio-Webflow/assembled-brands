import { greetUser } from "packages/frontend/utils/greet";
import { apiSignUp } from "./frontend/services/AuthService";
import type { AxiosError } from "axios";



window.Webflow ||= [];
window.Webflow.push(() => {
  const name = 'John Doe';
  greetUser(name);
  //add a test api call
  try {

    apiSignUp({
      email: 'test@test.com',
      password: 'test',
      name: 'Test User',
      phone: '1234567890',
      dial_code: '+1',
    })

  } catch (error) {
    const message = (error as AxiosError).message;
    console.error(error);

  }
});
