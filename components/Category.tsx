import Image from "next/image";

import { cn, getCategoryStyle } from "@/lib/utils";

const Category = ({ category }: CategoryProps) => {
  const style = getCategoryStyle(category.name);
  const progress =
    category.totalCount > 0
      ? (category.count / category.totalCount) * 100
      : 0;

  return (
    <div className={cn("gap-[18px] flex p-4 rounded-xl", style.bg)}>
      <figure className={cn("flex-center size-10 rounded-full", style.chipBg)}>
        <Image
          src="/icons/shopping-bag.svg"
          width={20}
          height={20}
          alt={category.name}
        />
      </figure>
      <div className="flex w-full flex-1 flex-col gap-2">
        <div className="text-14 flex justify-between">
          <h2 className={cn("font-medium", style.text)}>{category.name}</h2>
          <h3 className={cn("font-normal", style.text)}>{category.count}</h3>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/60">
          <div
            className="h-2 rounded-full"
            style={{ backgroundColor: style.barHex, width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default Category;
