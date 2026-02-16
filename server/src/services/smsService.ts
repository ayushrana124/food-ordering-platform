import axios from 'axios';
import config from '../config/config';
import { SMSResponse } from '../types/services';

export const sendOTP = async (phone: string, otp: string): Promise<SMSResponse> => {
    try {
        // Using 2Factor.in API
        const response = await axios.get<SMSResponse>(config.smsApiUrl, {
            params: {
                api_key: config.smsApiKey,
                module: 'TRANS_SMS',
                to: phone,
                from: 'RESTRO',
                msg: `Your OTP for restaurant login is ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`
            }
        });

        return response.data;
    } catch (error) {
        console.error('SMS Error:', error);
        throw new Error('Failed to send OTP. Please try again.');
    }
};
