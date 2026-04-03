import { FlaskConical, OctagonAlert, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

export function TaskBadges() {
  return (
    <div className="flex flex-wrap gap-2 p-8">
      <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 gap-1.5 hover:bg-green-50 dark:hover:bg-green-950">
        <Spinner className="size-3" />
        Running
      </Badge>
      <Badge className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 gap-1.5 hover:bg-red-50 dark:hover:bg-red-950">
        <OctagonAlert className="size-3" />
        Failed
      </Badge>
      <Badge className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 gap-1.5 hover:bg-yellow-50 dark:hover:bg-yellow-950">
        <Timer className="size-3" />
        Pending
      </Badge>
      <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 gap-1.5 hover:bg-blue-50 dark:hover:bg-blue-950">
        <FlaskConical className="size-3" />
        Testing
      </Badge>
    </div>
  );
}
