import cron, { ScheduledTask } from 'node-cron';
import { autoCancelUnpaidOrders } from '../controllers/paymentController';

const tasks: ScheduledTask[] = [];

/**
 * Background maintenance jobs.
 *
 * Auto-cancelling abandoned online orders used to run inline on *every*
 * admin `GET /orders` request, which meant an idle dashboard fired a
 * `updateMany` write against the orders collection several times a minute.
 * It belongs on a timer, not on the read path.
 *
 * The job is idempotent (a narrowly-filtered `updateMany`), so if you ever
 * scale to more than one instance a duplicate run is harmless — the second
 * one simply matches nothing.
 */
export const startBackgroundJobs = (): void => {
    // Every 5 minutes — orders are cancelled once unpaid for 15 minutes, so
    // this resolution is well inside the window.
    const cancelTask = cron.schedule('*/5 * * * *', async () => {
        try {
            const cancelled = await autoCancelUnpaidOrders();
            if (cancelled > 0) {
                console.log(`[jobs] Auto-cancelled ${cancelled} unpaid online order(s).`);
            }
        } catch (err) {
            console.error('[jobs] Auto-cancel failed:', err);
        }
    });

    tasks.push(cancelTask);
    console.log('[jobs] Background jobs started.');
};

export const stopBackgroundJobs = (): void => {
    for (const task of tasks) {
        task.stop();
    }
    tasks.length = 0;
};
