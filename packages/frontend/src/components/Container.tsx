import clsx from 'clsx';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

const Container: React.FC<ContainerProps> = ({ className, ...props }) => {
  return (
    <div className={clsx('max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8', className)} {...props} />
  );
};

export default Container;
