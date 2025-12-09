import type { AxiosError } from 'axios';

//import { greetUser } from '$utils/greet';
import { apiColdLeadRegister } from './shared/services/AuthService';

window.Webflow ||= [];
window.Webflow.push(() => {
  //const name = 'John Doe';
  //greetUser(name);
  //add a test api call
  const coldLeadRegister = async () => {
    try {
      await apiColdLeadRegister({
        work_email: 'briankennedy@assembledbrands.com',
      });
    } catch (error) {
      const { message } = error as AxiosError;
      console.error(message);
    }
  };

  coldLeadRegister();
});
