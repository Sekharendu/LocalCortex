import { Link } from "react-router-dom";
import { prevNext } from "../nav";
import { ArrowLeftIcon, ArrowRightIcon } from "./Icons";

export default function PrevNext({ path }: { path: string }) {
  const { prev, next } = prevNext(path);
  if (!prev && !next) return null;

  return (
    <nav className="prev-next" aria-label="Page navigation">
      {prev ? (
        <Link to={prev.path} className="prev-next-link prev">
          <ArrowLeftIcon />
          <span>
            <small>Previous</small>
            {prev.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link to={next.path} className="prev-next-link next">
          <span>
            <small>Next</small>
            {next.title}
          </span>
          <ArrowRightIcon />
        </Link>
      )}
    </nav>
  );
}
