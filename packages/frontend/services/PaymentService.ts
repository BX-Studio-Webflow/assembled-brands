import {
    CreateSubscriptionRequestBody,
    CreateSubscriptionResponse,
} from '@/@types/payment'
import ApiService from './ApiService'

export const apiCreateSubscription = (data: CreateSubscriptionRequestBody) => {
    return ApiService.fetchDataWithAxios<CreateSubscriptionResponse>({
        url: '/subscription/subscribe',
        method: 'post',
        data,
    })
}
