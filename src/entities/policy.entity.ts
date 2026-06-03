import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('policies')
export class Policy {
  @PrimaryColumn() PolicyNumber!: string;
  @Column({ nullable: true }) ProposalNumber!: string;
  @Column({ nullable: true }) ArchiveNumber!: string;
  @Column({ nullable: true }) ProductCode!: string;
  @Column({ nullable: true }) ProductName!: string;
  @Column({ nullable: true }) AgentCode!: string;
  @Column({ nullable: true }) AgentName!: string;
  @Column({ nullable: true }) AgentType!: string;
  @Column({ nullable: true }) EffectiveDate!: string;
  @Column('float', { nullable: true }) Premium!: number;
  @Column({ nullable: true }) PaymentFrequency!: string;
  @Column({ nullable: true }) BenefitFrequency!: string;
  @Column('int', { nullable: true }) ContractDuration!: number;
  @Column({ nullable: true }) ExpiryDate!: string;
  @Column({ nullable: true }) LastPaymentDate!: string;
  @Column('float', { nullable: true }) SumAssured!: number;
  @Column({ nullable: true }) Status!: string;
  @Column({ nullable: true }) StatusDate!: string;
  @Column({ nullable: true }) SubscriberNumber!: string;
  @Column({ nullable: true }) SubscriberName!: string;
  @Column({ nullable: true }) IDType!: string;
  @Column({ nullable: true }) IDNumber!: string;
  @Column({ nullable: true }) DateOfBirth!: string;
  @Column({ nullable: true }) PlaceOfBirth!: string;
  @Column({ nullable: true }) Gender!: string;
  @Column({ nullable: true }) MaritalStatus!: string;
  @Column({ nullable: true }) Nationality!: string;
  @Column('float', { nullable: true }) TotalPremiumPaid!: number;
  @Column('float', { nullable: true }) TotalPurePremium!: number;
  @Column({ nullable: true }) DateLapsed!: string;
  @Column({ nullable: true }) DatePaidUp!: string;
}
