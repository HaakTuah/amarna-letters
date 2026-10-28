/**
 * The rulebook's WORK AND MONEY part (build order item 11a, "Jobs, not wages", "Work on any terms", "Fees clear the market",
 * "Lending to kings", "Debts are facts; repayment is a choice", "Gold is a lifeline"): jobs with a fee, what a court's record
 * of paying is worth, the going rate, borrowing and repaying, and what the score counts. The numbers are read from the
 * engine's data, so the text stays true if they change.
 */
import { MoneyData, type GameConfig } from "@amarna/engine";

export function moneyRules(_c: GameConfig): string {
  const d = MoneyData;
  return [
    `WORK AND MONEY`,
    `- Jobs, not wages. You hire a person for a job (order hire: the person, the whole fee, the part of it handed over now, and the term in seasons). The advance is paid from your treasury when the job is agreed; the rest falls due when the job is done: the term served and the servant back at your court with no task. Nothing accrues: a job that runs long because the servant was detained or the passes closed costs what was agreed, and a servant away is paid nothing until it is done. When it falls due the rest is paid from your treasury, unless you withhold it (order withhold_fee, before it falls due) or the treasury cannot pay it; then you owe it, a promise broken (order pay_fee pays it later, while the person stands at your court). A servant dismissed, or one who quits, is owed nothing more.`,
    `- Your record. Every promise to pay that falls due, a fee or a loan, is kept or broken, and people hear of it. Each person counts on the rest of a fee from you only as far as your record lets it: ${d.trustStart} in a hundred with no record, ${d.trustKept} more for each promise kept and ${d.trustBroken} less for each broken (your view gives the figure). So a person takes your job if the advance, and the rest as far as it trusts you, reach what it asks a season times the term: a court known to pay can pay later, a court known to break its word must hand over more now or offer more. A servant you did not pay may quit, and one owed a fee says so.`,
    `- Fees clear the market. Nobody sets the price of work: what people ask follows the going rate of service, which rises a step (${d.rateStep} in a hundred) each season more hires are sought than people seek service at the courts, and falls when far fewer are, between ${d.rateLow} and ${d.rateHigh} in a hundred. The able ask more where their name stands high.`,
    `- People live their own lives. Out of service a person travels between courts to seek work where kings are hiring, trust is good and bread is cheap, or works for itself: lending, dealing with others. It lives from the market where it stays and keeps its gold in its purse or in a hoard at a city, which is lost to whoever takes the city, and passes to that city's court at its death. Newcomers come onto the map through its doors (the western sea, the eastern road, the Gulf, the Nile beyond Nubia) when the people of the age are fewer than at its start, and stand first at the court that holds the door.`,
    `- Borrowing (order borrow: the person, the gold, the sum to repay, the seasons). A person standing at your court may offer to lend (your court list says how much, and how much more it asks back after how many seasons). A loan is sealed on a debt tablet that records the sum to repay; the lender keeps it. Interest, the season and what follows a default are words. Nothing forces you to repay.`,
    `- Repaying (order repay: the debt, the gold). You repay whoever holds the tablet, when they stand at your court; repaid in full, the tablet is yours and the debt is settled. Whoever holds the tablet holds the claim: a tablet can be carried by an agent, sold, or taken from a captive or the dead. A debt not repaid by its season is a promise broken. Your kingdom's debts die with it if it falls.`,
    `- What the score counts. Your strength is what you hold, never what you owe or are owed: gold you borrow counts as yours until you repay it, and a fee you did not pay is not subtracted. What a default costs you is your name: dearer credit, or none, and dearer servants.`,
  ].join("\n");
}
