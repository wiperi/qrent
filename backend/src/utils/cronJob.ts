import cron from 'node-cron';
import { propertyService } from '@/services/PropertyService';

cron.schedule('0 10 * * *', async () => {
  console.log('[Cron] Sending daily property recommendation');
  await propertyService.sendDailyPropertyRecommendation();
});
