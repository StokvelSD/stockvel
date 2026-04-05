function Header() {
  const today = new Date().toDateString();

  return (
    <header>
      <p>{today}</p>
      <h2>Admin Panel</h2>
    </header>
  );
}

export default Header;
