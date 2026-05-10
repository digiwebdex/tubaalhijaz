import { Construction } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Props {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function AdminComingSoonPage({ title, description, icon: Icon = Construction }: Props) {
  return (
    <div className="p-6">
      <Card className="p-12 text-center bg-gradient-to-br from-secondary/40 to-background border-primary/20">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
          <Icon className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-heading font-bold mb-3 text-gradient-gold">{title}</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          {description || "এই module-টি Phase 2-এ চালু হবে। অপারেশনাল workflow, bilingual PDF voucher, এবং automation feature যোগ করা হবে।"}
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          Coming Soon — Phase 2
        </div>
      </Card>
    </div>
  );
}
