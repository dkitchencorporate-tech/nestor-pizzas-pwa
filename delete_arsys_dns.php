<?php
$loginAPI = 'nestorpizzas.es';
$claveAPI = 'Bt32pe7xb85Aro5fM2HQxdGTF';

$url = 'https://api.servidoresdns.net:54321/hosting/api/soap/index.php';
$client = new SoapClient($url . "?wsdl", array(
    'login' => $loginAPI,
    'password' => $claveAPI,
    'trace' => 1
));

function deleteDnsEntry($client, $domain, $dns, $type, $value) {
    try {
        $params = array(
            'input' => array(
                'domain' => $domain,
                'dns' => $dns,
                'type' => $type,
                'value' => $value
            )
        );
        $response = $client->DeleteDNSEntry($params);
        echo "Deleted $dns -> $value : ";
        print_r($response);
    } catch (Exception $e) {
        echo "Error deleting $dns: " . $e->getMessage() . "\n";
    }
}

// Delete Arsys default Name Servers
deleteDnsEntry($client, 'nestorpizzas.es', 'nestorpizzas.es', 'NS', 'dns97.servidoresdns.net.');
deleteDnsEntry($client, 'nestorpizzas.es', 'nestorpizzas.es', 'NS', 'dns98.servidoresdns.net.');
deleteDnsEntry($client, 'nestorpizzas.es', 'nestorpizzas.es', 'NS', 'dns97.servidoresdns.net');
deleteDnsEntry($client, 'nestorpizzas.es', 'nestorpizzas.es', 'NS', 'dns98.servidoresdns.net');

// Enviar el request A para modificar la root IP tambien en caso de que lo necesitemos
$params_info = array(
    'input' => array(
        'domain' => 'nestorpizzas.es'
    )
);
try{
    $info = $client->InfoDNSZone($params_info);
    print_r($info);
} catch (Exception $e) {
    echo "Error info: " . $e->getMessage() . "\n";
}
?>
