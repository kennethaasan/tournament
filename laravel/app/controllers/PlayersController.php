<?php

class PlayersController extends ApiController {

	/**
	 * Display a listing of players
	 *
	 * @return Response
	 */
	public function index()
	{
		$players = Player::orderBy('name')->get();

		if (count($players) === 0)
		{
			return $this->respondNotFound('No players exist.');
		}

		return $this->respond([
	        'data' => $this->transformCollection($players)
	    ]);
	}


	/**
	 * Store a newly created player in storage.
	 *
	 * @return Response
	 */
	public function store()
	{
		$data = Input::all();

		$validator = Validator::make($data, Player::$rules);

		if ($validator->fails())
		{
			return $this->respondBadRequest('Validation fails.', $validator->messages()->toArray());
		}

		$player = Player::create($data);

		return $this->respondCreated('Player successfully created.');
	}

	/**
	 * Display the specified player.
	 *
	 * @param  int  $id
	 * @return Response
	 */
	public function show($id)
	{
		$player = Player::find($id);

		if ( ! $player)
		{
			return $this->respondNotFound('Player does not exist.');
		}

		return $this->respond([
	        'data' => $this->transform($player)
	    ]);
	}


	/**
	 * Update the specified player in storage.
	 *
	 * @param  int  $id
	 * @return Response
	 */
	public function update($id)
	{
		$data = Input::all();

		$validator = Validator::make($data, Player::$rules);

		if ($validator->fails())
		{
			return $this->respondBadRequest('Validation fails.', $validator->messages()->toArray());
		}

		$player = Player::find($id);

		$player->update($data);

		return $this->respondCreated('Player successfully updated.');
	}

	/**
	 * Remove the specified player from storage.
	 *
	 * @param  int  $id
	 * @return Response
	 */
	public function destroy($id)
	{
		Player::destroy($id);

		return $this->respondCreated('Player successfully deleted.');
	}

	private function transform($player)
	{
		return [
			'id' 		=> (int) $player['id'],
			'name' 		=> $player['name'],
			'number' 	=> (int) $player['number'],
			'paid' 		=> (boolean) $player['paid'],
			'team_id'	=> (int) $player['team_id'],
			'team'		=> Team::find($player['team_id'])->name
		];
	}

	private function transformCollection($players)
	{
		return array_map([$this, 'transform'], $players->toArray());
	}

}
