import type { AxiosError } from 'axios';
import { greetUser } from '$utils/greet';

import { apiSignUp } from './services/AuthService';

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
        });
        console.log('API call successful');
    } catch (error) {
        const { message } = error as AxiosError;
        console.error(message);
    }
});