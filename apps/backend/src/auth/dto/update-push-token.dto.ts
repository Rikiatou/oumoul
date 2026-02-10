export class UpdatePushTokenDto {
  pushToken!: string;
  platform?: 'ios' | 'android';
}
