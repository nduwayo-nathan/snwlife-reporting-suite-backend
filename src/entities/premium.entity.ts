import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('premiums')
export class Premium {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' }) id!: number;
  @Column({ nullable: true }) PolicyNumber!: string;
  @Column({ nullable: true }) Product!: string;
  @Column({ type: 'date', nullable: true }) EffectDate!: string;
  @Column({ nullable: true }) State!: string;
  @Column({ nullable: true }) PremiumDuration!: string;
  @Column({ type: 'date', nullable: true }) PaymentExpiryDate!: string;
  @Column({ nullable: true }) gender!: string;
  @Column({ type: 'int', nullable: true }) Age!: number;
  @Column({ type: 'numeric', nullable: true }) Premium!: number;
  @Column({ type: 'numeric', nullable: true }) PremiumPaid!: number;
  @Column({ type: 'date', nullable: true }) PaymentDate!: string;
  @Column({ nullable: true }) Receipt!: string;
  @Column({ type: 'numeric', nullable: true }) PurePremium!: number;
  @Column({ type: 'numeric', nullable: true }) ManagementFee!: number;
  @Column({ type: 'numeric', nullable: true }) AcquisitionFee!: number;
  @Column({ type: 'numeric', nullable: true }) InstalmentFee!: number;
  @Column({ nullable: true }) VATfee!: string;
  @Column({ type: 'numeric', nullable: true }) DeathPremium!: number;
  @Column({ type: 'date', nullable: true }) PostingDate!: string;
  @Column({ nullable: true }) DocReference!: string;
  @Column({ nullable: true }) Bank!: string;
  @Column({ nullable: true }) ClientCode!: string;
  @Column({ nullable: true }) insured!: string;
  @Column({ nullable: true }) Source!: string;
  @Column({ nullable: true }) District!: string;
  @Column({ nullable: true }) Sector!: string;
  @Column({ nullable: true }) Branch!: string;
  @Column({ nullable: true }) AgencyCode!: string;
  @Column({ nullable: true }) AgencyName!: string;
  @Column({ nullable: true }) UserName!: string;
  @Column({ name: 'created_at', type: 'timestamp', nullable: true }) CreatedAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamp', nullable: true }) UpdatedAt!: Date;
}
