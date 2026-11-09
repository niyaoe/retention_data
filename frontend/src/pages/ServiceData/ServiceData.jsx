import { useEffect, useState } from "react";
import api from "../../services/api";
import DataTable from "../../components/common/DataTable";
import "./ServiceData.css";

const ServiceData = () => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchServiceData = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/data/service", {
          params: {
            page,
            limit,
            search: debouncedSearch,
          },
        });

        const result = response.data;

        setData(result.data || []);
        setTotal(result.total || 0);
        setTotalPages(result.totalPages || 1);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load service records."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchServiceData();
  }, [page, limit, debouncedSearch]);

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "-"
      : date.toLocaleDateString("en-IN");
  };

  const columns = [
    {
      key: "billDate",
      label: "Bill Date",
      render: formatDate,
    },
    {
      key: "dealerLocation",
      label: "Dealer Location",
    },
    {
      key: "repairOrderNumber",
      label: "RO Number",
    },
    {
      key: "roDate",
      label: "RO Date",
      render: formatDate,
    },
    {
      key: "registrationNumber",
      label: "Registration No",
    },
    {
      key: "chassisNumber",
      label: "Chassis Number",
    },
    {
      key: "serviceCategory",
      label: "Service Category",
    },
    {
      key: "serviceType",
      label: "Service Type",
    },
    {
      key: "roServiceAdvisor",
      label: "Service Advisor",
    },
    {
      key: "productName",
      label: "Product",
    },
  ];

  return (
    <div className="ret-service-page">
      {/* <div className="ret-service-header">
        <div>
          <h2>Service Data</h2>
          <p>View and search all repair order records.</p>
        </div>
      </div> */}

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        error={error}
        search={search}
        onSearchChange={setSearch}
        page={page}
        total={total}
        totalPages={totalPages}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
      />
    </div>
  );
};

export default ServiceData;