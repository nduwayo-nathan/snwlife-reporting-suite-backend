import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('claims')
export class Claim {
  @PrimaryColumn() ClaimNumber!: string;
  @Column({ nullable: true }) ProposalNumber!: string;
  @Column({ nullable: true }) PolicyNumber!: string;
  @Column({ nullable: true }) ArchiveNumber!: string;
  @Column('float', { nullable: true }) OfficePremium!: number;
  @Column({ nullable: true }) ClaimDate!: string;
  @Column({ nullable: true }) SubscriberNumber!: string;
  @Column({ nullable: true }) SubscriberName!: string;
  @Column({ nullable: true }) SubscriberID!: string;
  @Column({ nullable: true }) AgentCode!: string;
  @Column({ nullable: true }) AgentName!: string;
  @Column({ nullable: true }) Product!: string;
  @Column({ nullable: true }) Branch!: string;
  @Column({ nullable: true }) RequestID!: string;
  @Column({ nullable: true }) RequestDate!: string;
  @Column({ nullable: true }) RequestReceiver!: string;
  @Column('float', { nullable: true }) ReserveAmount!: number;
  @Column('float', { nullable: true }) TotalPremiumPaid!: number;
  @Column('float', { nullable: true }) TotalInvestedPremium!: number;
  @Column('float', { nullable: true }) TotalInterest!: number;
  @Column('float', { nullable: true }) TotalWithdrawal!: number;
  @Column('float', { nullable: true }) TotalAmountToPay!: number;
  @Column({ nullable: true }) DeclarationDate!: string;
  @Column({ nullable: true }) ClaimStatus!: string;
  @Column({ nullable: true }) Claimant!: string;
  @Column({ nullable: true }) ClaimType!: string;
  @Column({ nullable: true }) PaymentDate!: string;
  @Column('float', { nullable: true }) AmountPaid!: number;
  @Column({ nullable: true }) Approver!: string;
}
