import Header from "../components/Header";
import Wallet from "../components/Wallet";
import Actions from "../components/Actions";
import BottomNav from "../components/BottomNav";
import ShowActiveGroup from "../components/ShowActiveGroups";

function AdminPage() {
  return (
    <>
      <Header />
      <Wallet />
      <Actions />
      <BottomNav />
      <ShowActiveGroup />
    </>
  );
}

export default AdminPage;
