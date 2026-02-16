export interface SMSResponse {
    Status: string;
    Details: string;
}

export interface SMSError {
    message: string;
    code?: string;
}
