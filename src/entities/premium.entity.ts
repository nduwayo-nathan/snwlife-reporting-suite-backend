import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('premiums')
export class Premium {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ nullable: true }) PolicyNumber!: string;
  @Column({ nullable: true }) ProductCode!: string;
  @Column({ nullable: true }) EffectDate!: string;
  @Column({ nullable: true }) State!: string;
  @Column('int', { nullable: true }) PremiumDuration!: number;
  @Column({ nullable: true }) PaymentExpiryDate!: string;
  @Column({ nullable: true }) Gender!: string;
  @Column('int', { nullable: true }) Age!: number;
  @Column('float', { nullable: true }) Premium!: number;
  @Column('float', { nullable: true }) PremiumPaid!: number;
  @Column({ nullable: true }) PaymentDate!: string;
  @Column({ nullable: true }) Receipt!: string;
  @Column({ nullable: true }) AgencyCode!: string;
  @Column({ nullable: true }) AgencyName!: string;
}
